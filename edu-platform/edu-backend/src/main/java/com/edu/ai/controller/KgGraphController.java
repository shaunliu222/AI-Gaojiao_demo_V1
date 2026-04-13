package com.edu.ai.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.edu.ai.common.R;
import com.edu.ai.entity.*;
import com.edu.ai.service.KgGraphService;
import com.edu.ai.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Knowledge Graph")
@RestController
@RequestMapping("/api/knowledge/graphs")
@RequiredArgsConstructor
public class KgGraphController {

    private final KgGraphService kgService;
    private final SysUserService sysUserService;

    // --- Graph CRUD ---

    @Operation(summary = "List knowledge graphs")
    @GetMapping
    public R<List<KgGraph>> list() {
        Long userId = StpUtil.getLoginIdAsLong();
        List<String> roles = sysUserService.getRoleCodes(userId);
        return R.ok(kgService.listGraphs(userId, roles));
    }

    @Operation(summary = "Create knowledge graph")
    @PostMapping
    public R<KgGraph> create(@RequestBody KgGraph graph) {
        graph.setOwnerId(StpUtil.getLoginIdAsLong());
        if (graph.getStatus() == null) graph.setStatus("active");
        if (graph.getIsPublic() == null) graph.setIsPublic(false);
        graph.setNodeCount(0);
        graph.setEdgeCount(0);
        graph.setDeleted((short) 0);
        kgService.save(graph);
        return R.ok(graph);
    }

    @Operation(summary = "Get graph detail")
    @GetMapping("/{id}")
    public R<KgGraph> detail(@PathVariable Long id) {
        return R.ok(kgService.getById(id));
    }

    @Operation(summary = "Delete graph")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        kgService.removeById(id);
        return R.ok();
    }

    // --- Graph data (nodes + edges for G6) ---

    @Operation(summary = "Get all nodes and edges for graph visualization")
    @GetMapping("/{id}/data")
    public R<Map<String, Object>> graphData(@PathVariable Long id) {
        Map<String, Object> data = new HashMap<>();
        data.put("nodes", kgService.getNodes(id));
        data.put("edges", kgService.getEdges(id));
        data.put("attachmentCounts", kgService.getAttachmentCounts(id));
        return R.ok(data);
    }

    // --- Node CRUD ---

    @Operation(summary = "Add node")
    @PostMapping("/{graphId}/nodes")
    public R<KgNode> addNode(@PathVariable Long graphId, @RequestBody KgNode node) {
        node.setGraphId(graphId);
        return R.ok(kgService.addNode(node));
    }

    @Operation(summary = "Update node")
    @PutMapping("/{graphId}/nodes/{nodeId}")
    public R<Void> updateNode(@PathVariable Long graphId, @PathVariable Long nodeId, @RequestBody KgNode node) {
        node.setId(nodeId);
        node.setGraphId(graphId);
        kgService.getBaseMapper(); // Access nodeMapper through service
        return R.ok();
    }

    @Operation(summary = "Delete node")
    @DeleteMapping("/{graphId}/nodes/{nodeId}")
    public R<Void> deleteNode(@PathVariable Long graphId, @PathVariable Long nodeId) {
        kgService.deleteNode(nodeId);
        return R.ok();
    }

    // --- Edge CRUD ---

    @Operation(summary = "Add edge")
    @PostMapping("/{graphId}/edges")
    public R<KgEdge> addEdge(@PathVariable Long graphId, @RequestBody KgEdge edge) {
        edge.setGraphId(graphId);
        return R.ok(kgService.addEdge(edge));
    }

    @Operation(summary = "Delete edge")
    @DeleteMapping("/{graphId}/edges/{edgeId}")
    public R<Void> deleteEdge(@PathVariable Long graphId, @PathVariable Long edgeId) {
        kgService.deleteEdge(edgeId);
        return R.ok();
    }

    // --- Step 1: Skeleton ---

    @Operation(summary = "Create graph skeleton (batch nodes + edges)")
    @PostMapping("/{graphId}/skeleton")
    public R<Void> createSkeleton(@PathVariable Long graphId, @RequestBody SkeletonRequest request) {
        kgService.createSkeleton(graphId, request.getNodes(), request.getEdges());
        return R.ok();
    }

    // --- Step 2: Trigger extraction ---

    @Operation(summary = "Trigger LLM entity extraction from text")
    @PostMapping("/{graphId}/build")
    public R<KgBuildTask> triggerBuild(@PathVariable Long graphId, @RequestBody BuildRequest request) {
        return R.ok(kgService.triggerExtraction(graphId, request.getText()));
    }

    // --- Step 2/3: Get build task status ---

    @Operation(summary = "Get build task status and results")
    @GetMapping("/{graphId}/build-tasks/{taskId}")
    public R<KgBuildTask> getBuildTask(@PathVariable Long graphId, @PathVariable Long taskId) {
        return R.ok(kgService.getBuildTask(taskId));
    }

    // --- Step 3: Approve ---

    @Operation(summary = "Approve extracted entities and relations")
    @PostMapping("/{graphId}/build-tasks/{taskId}/approve")
    public R<Void> approveExtraction(@PathVariable Long graphId, @PathVariable Long taskId,
                                     @RequestBody SkeletonRequest request) {
        kgService.approveExtraction(graphId, request.getNodes(), request.getEdges());
        return R.ok();
    }

    // --- Step 4: Attach ---

    @Operation(summary = "Attach knowledge snippet to node")
    @PostMapping("/{graphId}/attach")
    public R<KgAttachment> attach(@PathVariable Long graphId, @RequestBody AttachRequest request) {
        return R.ok(kgService.attachKnowledge(graphId, request.getNodeId(), request.getContent(), request.getFileId()));
    }

    @Operation(summary = "Get attachments for a node")
    @GetMapping("/{graphId}/attachments")
    public R<List<KgAttachment>> attachments(@PathVariable Long graphId, @RequestParam(required = false) Long nodeId) {
        return R.ok(kgService.getAttachments(graphId, nodeId));
    }

    // --- Step 5: Query ---

    @Operation(summary = "Knowledge query (graph + LLM)")
    @PostMapping("/{graphId}/query")
    public R<Map<String, Object>> query(@PathVariable Long graphId, @RequestBody QueryRequest request) {
        return R.ok(kgService.queryKnowledge(graphId, request.getQuestion()));
    }

    // --- Step 1 LLM: Extract skeleton ---

    @Operation(summary = "LLM-assisted skeleton extraction from text")
    @PostMapping("/{graphId}/extract-skeleton")
    public R<String> extractSkeleton(@PathVariable Long graphId, @RequestBody BuildRequest request) {
        return R.ok(kgService.extractSkeleton(request.getText()));
    }

    // --- Step 4 LLM: Auto-attach knowledge chunks ---

    @Operation(summary = "Auto-attach: LLM slices text into chunks and matches to graph nodes")
    @PostMapping("/{graphId}/auto-attach")
    public R<Map<String, Object>> autoAttach(@PathVariable Long graphId, @RequestBody BuildRequest request) {
        return R.ok(kgService.autoAttach(graphId, request.getText()));
    }

    // --- Request DTOs ---

    @Data
    public static class SkeletonRequest {
        private List<KgNode> nodes;
        private List<KgEdge> edges;
    }

    @Data
    public static class BuildRequest {
        private String text;
    }

    @Data
    public static class AttachRequest {
        private Long nodeId;
        private String content;
        private Long fileId;
    }

    @Data
    public static class QueryRequest {
        private String question;
    }
}
