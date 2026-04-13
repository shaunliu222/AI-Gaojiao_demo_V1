package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.dto.ChatMessage;
import com.edu.ai.dto.ChatRequest;
import com.edu.ai.entity.*;
import com.edu.ai.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KgGraphService extends ServiceImpl<KgGraphMapper, KgGraph> {

    private final KgNodeMapper nodeMapper;
    private final KgEdgeMapper edgeMapper;
    private final KgBuildTaskMapper buildTaskMapper;
    private final KgAttachmentMapper attachmentMapper;
    private final OpenClawClient openClawClient;
    private final KgBuildAsyncService buildAsyncService;

    // --- Graph CRUD ---

    public List<KgGraph> listGraphs(Long userId, List<String> roleCodes) {
        LambdaQueryWrapper<KgGraph> wrapper = new LambdaQueryWrapper<>();
        if (!roleCodes.contains("admin") && !roleCodes.contains("info_center")) {
            wrapper.and(w -> w.eq(KgGraph::getIsPublic, true).or().eq(KgGraph::getOwnerId, userId));
        }
        wrapper.orderByDesc(KgGraph::getCreatedAt);
        return list(wrapper);
    }

    // --- Node/Edge CRUD ---

    public List<KgNode> getNodes(Long graphId) {
        return nodeMapper.selectList(new LambdaQueryWrapper<KgNode>().eq(KgNode::getGraphId, graphId));
    }

    public List<KgEdge> getEdges(Long graphId) {
        return edgeMapper.selectList(new LambdaQueryWrapper<KgEdge>().eq(KgEdge::getGraphId, graphId));
    }

    @Transactional
    public KgNode addNode(KgNode node) {
        nodeMapper.insert(node);
        updateCounts(node.getGraphId());
        return node;
    }

    @Transactional
    public KgEdge addEdge(KgEdge edge) {
        edgeMapper.insert(edge);
        updateCounts(edge.getGraphId());
        return edge;
    }

    @Transactional
    public void deleteNode(Long nodeId) {
        KgNode node = nodeMapper.selectById(nodeId);
        if (node == null) return;
        edgeMapper.delete(new LambdaQueryWrapper<KgEdge>()
                .eq(KgEdge::getSourceNodeId, nodeId).or().eq(KgEdge::getTargetNodeId, nodeId));
        nodeMapper.deleteById(nodeId);
        updateCounts(node.getGraphId());
    }

    @Transactional
    public void deleteEdge(Long edgeId) {
        KgEdge edge = edgeMapper.selectById(edgeId);
        if (edge == null) return;
        edgeMapper.deleteById(edgeId);
        updateCounts(edge.getGraphId());
    }

    // --- Step 1: Skeleton (batch insert) ---

    @Transactional
    public void createSkeleton(Long graphId, List<KgNode> nodes, List<KgEdge> edges) {
        for (KgNode node : nodes) {
            node.setGraphId(graphId);
            nodeMapper.insert(node);
        }
        for (KgEdge edge : edges) {
            edge.setGraphId(graphId);
            edgeMapper.insert(edge);
        }
        updateCounts(graphId);
    }

    // --- Step 2: LLM Entity Extraction ---

    @Transactional
    public KgBuildTask triggerExtraction(Long graphId, String documentText) {
        KgBuildTask task = new KgBuildTask();
        task.setGraphId(graphId);
        task.setTaskType("extract");
        task.setStatus("pending");
        task.setProgress(0);
        buildTaskMapper.insert(task);

        buildAsyncService.extractAsync(task.getId(), graphId, documentText);
        return task;
    }

    // --- Step 3: Approve extraction results ---

    @Transactional
    public void approveExtraction(Long graphId, List<KgNode> nodes, List<KgEdge> edges) {
        createSkeleton(graphId, nodes, edges);
    }

    // --- Step 4: Attach knowledge ---

    @Transactional
    public KgAttachment attachKnowledge(Long graphId, Long nodeId, String contentSnippet, Long fileId) {
        KgAttachment att = new KgAttachment();
        att.setGraphId(graphId);
        att.setNodeId(String.valueOf(nodeId));
        att.setContentSnippet(contentSnippet);
        att.setFileId(fileId);
        attachmentMapper.insert(att);
        return att;
    }

    public List<KgAttachment> getAttachments(Long graphId, Long nodeId) {
        LambdaQueryWrapper<KgAttachment> wrapper = new LambdaQueryWrapper<KgAttachment>()
                .eq(KgAttachment::getGraphId, graphId);
        if (nodeId != null) wrapper.eq(KgAttachment::getNodeId, String.valueOf(nodeId));
        return attachmentMapper.selectList(wrapper);
    }

    // --- Step 5: Knowledge Query ---

    public Map<String, Object> queryKnowledge(Long graphId, String question) {
        // 1. Find matching nodes by keyword
        List<KgNode> allNodes = getNodes(graphId);
        String lowerQ = question.toLowerCase();
        List<KgNode> matchedNodes = allNodes.stream()
                .filter(n -> n.getName().toLowerCase().contains(lowerQ) ||
                        (n.getDescription() != null && n.getDescription().toLowerCase().contains(lowerQ)))
                .collect(Collectors.toList());

        // 2. Expand via edges (1 level)
        Set<Long> nodeIds = matchedNodes.stream().map(KgNode::getId).collect(Collectors.toSet());
        List<KgEdge> allEdges = getEdges(graphId);
        Set<Long> expandedIds = new HashSet<>(nodeIds);
        for (KgEdge edge : allEdges) {
            if (nodeIds.contains(edge.getSourceNodeId())) expandedIds.add(edge.getTargetNodeId());
            if (nodeIds.contains(edge.getTargetNodeId())) expandedIds.add(edge.getSourceNodeId());
        }

        // 3. Collect attachments from expanded nodes
        List<KgAttachment> snippets = new ArrayList<>();
        for (Long nid : expandedIds) {
            snippets.addAll(getAttachments(graphId, nid));
        }

        // 4. Build context and call LLM
        String context = snippets.stream()
                .map(KgAttachment::getContentSnippet)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("\n\n---\n\n"));

        String answer;
        if (context.isEmpty()) {
            answer = "未找到相关知识片段，请尝试其他问题或先上传相关资料。";
        } else {
            try {
                String prompt = "基于以下知识片段回答问题。请在回答中标注引用来源。\n\n" +
                        "知识片段：\n" + context + "\n\n问题：" + question;
                ChatRequest request = new ChatRequest();
                request.setMessages(List.of(createMessage("user", prompt)));
                answer = openClawClient.chatCompletion(request);
            } catch (Exception e) {
                answer = "AI 服务暂时不可用，以下是相关知识片段：\n\n" + context;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("answer", answer);
        result.put("matchedNodes", matchedNodes.stream().map(KgNode::getName).toList());
        result.put("snippetCount", snippets.size());
        result.put("snippets", snippets.stream().map(KgAttachment::getContentSnippet).filter(Objects::nonNull).toList());
        return result;
    }

    // --- Helpers ---

    public KgBuildTask getBuildTask(Long taskId) {
        return buildTaskMapper.selectById(taskId);
    }

    private void updateCounts(Long graphId) {
        long nodeCount = nodeMapper.selectCount(new LambdaQueryWrapper<KgNode>().eq(KgNode::getGraphId, graphId));
        long edgeCount = edgeMapper.selectCount(new LambdaQueryWrapper<KgEdge>().eq(KgEdge::getGraphId, graphId));
        lambdaUpdate().set(KgGraph::getNodeCount, (int) nodeCount).set(KgGraph::getEdgeCount, (int) edgeCount)
                .eq(KgGraph::getId, graphId).update();
    }

    private ChatMessage createMessage(String role, String content) {
        ChatMessage msg = new ChatMessage();
        msg.setRole(role);
        msg.setContent(content);
        return msg;
    }
}
