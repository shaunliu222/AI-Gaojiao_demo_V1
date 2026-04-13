package com.edu.ai.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.edu.ai.common.R;
import com.edu.ai.entity.*;
import com.edu.ai.service.CompGraphService;
import com.edu.ai.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Competency Graph")
@RestController
@RequestMapping("/api/competency")
@RequiredArgsConstructor
public class CompGraphController {

    private final CompGraphService compService;
    private final SysUserService sysUserService;

    // --- Graph CRUD ---

    @Operation(summary = "List competency graphs")
    @GetMapping("/graphs")
    public R<List<CompGraph>> list() {
        Long userId = StpUtil.getLoginIdAsLong();
        return R.ok(compService.listGraphs(userId, sysUserService.getRoleCodes(userId)));
    }

    @Operation(summary = "Create competency graph")
    @PostMapping("/graphs")
    public R<CompGraph> create(@RequestBody CompGraph graph) {
        graph.setOwnerId(StpUtil.getLoginIdAsLong());
        if (graph.getStatus() == null) graph.setStatus("active");
        if (graph.getIsPublic() == null) graph.setIsPublic(false);
        graph.setDeleted((short) 0);
        compService.save(graph);
        return R.ok(graph);
    }

    @Operation(summary = "Get graph detail")
    @GetMapping("/graphs/{id}")
    public R<CompGraph> detail(@PathVariable Long id) {
        return R.ok(compService.getById(id));
    }

    @Operation(summary = "Delete graph")
    @DeleteMapping("/graphs/{id}")
    public R<Void> delete(@PathVariable Long id) {
        compService.removeById(id);
        return R.ok();
    }

    @Operation(summary = "Get graph data (nodes + edges)")
    @GetMapping("/graphs/{id}/data")
    public R<Map<String, Object>> graphData(@PathVariable Long id) {
        Map<String, Object> data = new HashMap<>();
        data.put("nodes", compService.getNodes(id));
        data.put("edges", compService.getEdges(id));
        return R.ok(data);
    }

    // --- Assessment ---

    @Operation(summary = "Submit competency assessment")
    @PostMapping("/assess")
    public R<CompAssessment> assess(@RequestBody AssessRequest request) {
        Long userId = StpUtil.getLoginIdAsLong();
        return R.ok(compService.submitAssessment(userId, request.getGraphId(), request.getJobNodeId(), request.getScores()));
    }

    // --- Gap Analysis ---

    @Operation(summary = "Run gap analysis on assessment")
    @PostMapping("/gap-analysis")
    public R<Map<String, Object>> gapAnalysis(@RequestParam Long assessmentId) {
        return R.ok(compService.gapAnalysis(assessmentId));
    }

    // --- Learning Path ---

    @Operation(summary = "Generate learning path from gap analysis")
    @PostMapping("/generate-path")
    public R<CompLearningPath> generatePath(@RequestParam Long assessmentId) {
        Long userId = StpUtil.getLoginIdAsLong();
        return R.ok(compService.generateLearningPath(userId, assessmentId));
    }

    @Operation(summary = "Get user's latest learning path")
    @GetMapping("/learning-path")
    public R<CompLearningPath> learningPath() {
        Long userId = StpUtil.getLoginIdAsLong();
        return R.ok(compService.getLatestPath(userId));
    }

    @Data
    public static class AssessRequest {
        private Long graphId;
        private String jobNodeId;
        private Map<String, Object> scores;
    }
}
