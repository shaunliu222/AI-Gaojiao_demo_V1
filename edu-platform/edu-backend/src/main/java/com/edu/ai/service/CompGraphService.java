package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.entity.*;
import com.edu.ai.mapper.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompGraphService extends ServiceImpl<CompGraphMapper, CompGraph> {

    private final KgNodeMapper nodeMapper;
    private final KgEdgeMapper edgeMapper;
    private final CompAssessmentMapper assessmentMapper;
    private final CompLearningPathMapper learningPathMapper;

    public List<CompGraph> listGraphs(Long userId, List<String> roleCodes) {
        LambdaQueryWrapper<CompGraph> wrapper = new LambdaQueryWrapper<>();
        if (!roleCodes.contains("admin") && !roleCodes.contains("info_center")) {
            wrapper.and(w -> w.eq(CompGraph::getIsPublic, true).or().eq(CompGraph::getOwnerId, userId));
        }
        wrapper.orderByDesc(CompGraph::getCreatedAt);
        return list(wrapper);
    }

    // Reuse kg_node/kg_edge for competency graph structure (differentiated by graph association)
    public List<KgNode> getNodes(Long graphId) {
        return nodeMapper.selectList(new LambdaQueryWrapper<KgNode>().eq(KgNode::getGraphId, graphId));
    }

    public List<KgEdge> getEdges(Long graphId) {
        return edgeMapper.selectList(new LambdaQueryWrapper<KgEdge>().eq(KgEdge::getGraphId, graphId));
    }

    // --- Assessment ---

    @Transactional
    public CompAssessment submitAssessment(Long userId, Long graphId, String jobNodeId, Map<String, Object> scores) {
        CompAssessment assessment = new CompAssessment();
        assessment.setUserId(userId);
        assessment.setGraphId(graphId);
        assessment.setJobNodeId(jobNodeId);
        assessment.setResult(scores);
        assessmentMapper.insert(assessment);
        return assessment;
    }

    // --- Gap Analysis ---

    public Map<String, Object> gapAnalysis(Long assessmentId) {
        CompAssessment assessment = assessmentMapper.selectById(assessmentId);
        if (assessment == null) return Map.of("error", "Assessment not found");

        Map<String, Object> scores = assessment.getResult();
        if (scores == null) return Map.of("gaps", List.of());

        // Find job node and its required competencies
        // For demo: job requirements are stored as properties on competency nodes
        // Gap = required score - current score
        List<Map<String, Object>> gaps = new ArrayList<>();
        for (Map.Entry<String, Object> entry : scores.entrySet()) {
            String competency = entry.getKey();
            double current = ((Number) entry.getValue()).doubleValue();
            double required = 80.0; // Default requirement threshold for demo
            if (current < required) {
                Map<String, Object> gap = new HashMap<>();
                gap.put("competency", competency);
                gap.put("current", current);
                gap.put("required", required);
                gap.put("gap", required - current);
                gaps.add(gap);
            }
        }

        // Sort by largest gap first
        gaps.sort((a, b) -> Double.compare((double) b.get("gap"), (double) a.get("gap")));

        Map<String, Object> result = new HashMap<>();
        result.put("gaps", gaps);
        result.put("totalGaps", gaps.size());
        result.put("assessmentId", assessmentId);

        // Save gap analysis to assessment
        assessment.setGapAnalysis(result);
        assessmentMapper.updateById(assessment);

        return result;
    }

    // --- Learning Path ---

    @Transactional
    public CompLearningPath generateLearningPath(Long userId, Long assessmentId) {
        CompAssessment assessment = assessmentMapper.selectById(assessmentId);
        if (assessment == null) return null;

        Map<String, Object> gapResult = assessment.getGapAnalysis();
        if (gapResult == null) {
            gapResult = gapAnalysis(assessmentId);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) gapResult.get("gaps");
        if (gaps == null || gaps.isEmpty()) {
            Map<String, Object> pathData = Map.of("steps", List.of(), "message", "No gaps found — all competencies met!");
            CompLearningPath path = new CompLearningPath();
            path.setUserId(userId);
            path.setAssessmentId(assessmentId);
            path.setPathData(pathData);
            path.setStatus("active");
            learningPathMapper.insert(path);
            return path;
        }

        // Build learning steps from gaps (ordered by prerequisite)
        List<Map<String, Object>> steps = new ArrayList<>();
        int order = 1;
        for (Map<String, Object> gap : gaps) {
            Map<String, Object> step = new HashMap<>();
            step.put("order", order++);
            step.put("competency", gap.get("competency"));
            step.put("currentScore", gap.get("current"));
            step.put("targetScore", gap.get("required"));
            step.put("gap", gap.get("gap"));
            step.put("recommendation", "Study materials related to: " + gap.get("competency"));
            steps.add(step);
        }

        Map<String, Object> pathData = new HashMap<>();
        pathData.put("steps", steps);
        pathData.put("totalSteps", steps.size());

        CompLearningPath path = new CompLearningPath();
        path.setUserId(userId);
        path.setAssessmentId(assessmentId);
        path.setPathData(pathData);
        path.setStatus("active");
        learningPathMapper.insert(path);
        return path;
    }

    public CompLearningPath getLatestPath(Long userId) {
        return learningPathMapper.selectOne(new LambdaQueryWrapper<CompLearningPath>()
                .eq(CompLearningPath::getUserId, userId)
                .orderByDesc(CompLearningPath::getCreatedAt)
                .last("LIMIT 1"));
    }
}
