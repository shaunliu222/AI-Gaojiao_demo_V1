package com.edu.ai.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.edu.ai.common.PageResult;
import com.edu.ai.common.R;
import com.edu.ai.entity.AgentDefinition;
import com.edu.ai.entity.AgentPublish;
import com.edu.ai.mapper.AgentPublishMapper;
import com.edu.ai.service.AgentService;
import com.edu.ai.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Agent Management")
@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;
    private final SysUserService sysUserService;
    private final AgentPublishMapper publishMapper;

    @Operation(summary = "List agents (permission-filtered)")
    @GetMapping
    public R<PageResult<AgentDefinition>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category) {
        Long userId = StpUtil.getLoginIdAsLong();
        List<String> roles = sysUserService.getRoleCodes(userId);
        IPage<AgentDefinition> result = agentService.pageAgents(page, size, keyword, category, userId, roles);
        return R.ok(PageResult.of(result));
    }

    @Operation(summary = "List public agents (explore)")
    @GetMapping("/public")
    public R<List<AgentDefinition>> publicAgents() {
        return R.ok(agentService.listPublicAgents());
    }

    @Operation(summary = "Get agent detail")
    @GetMapping("/{id}")
    public R<AgentDefinition> detail(@PathVariable Long id) {
        return R.ok(agentService.getById(id));
    }

    @Operation(summary = "Create agent")
    @PostMapping
    public R<AgentDefinition> create(@RequestBody AgentDefinition agent) {
        agent.setOwnerId(StpUtil.getLoginIdAsLong());
        if (agent.getStatus() == null) agent.setStatus("draft");
        if (agent.getIsPublic() == null) agent.setIsPublic(false);
        if (agent.getUseCount() == null) agent.setUseCount(0L);
        agent.setDeleted((short) 0);
        agentService.save(agent);
        return R.ok(agent);
    }

    @Operation(summary = "Update agent")
    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @RequestBody AgentDefinition agent) {
        agent.setId(id);
        agentService.updateById(agent);
        return R.ok();
    }

    @Operation(summary = "Delete agent")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        agentService.removeById(id);
        return R.ok();
    }

    @Operation(summary = "Publish agent to channel")
    @PostMapping("/{id}/publish")
    public R<AgentPublish> publish(@PathVariable Long id, @RequestBody AgentPublish publish) {
        publish.setAgentId(id);
        if (publish.getStatus() == null) publish.setStatus("active");
        publishMapper.insert(publish);
        agentService.lambdaUpdate().set(AgentDefinition::getStatus, "published")
                .eq(AgentDefinition::getId, id).update();
        return R.ok(publish);
    }

    @Operation(summary = "Get agent publish records")
    @GetMapping("/{id}/publishes")
    public R<List<AgentPublish>> publishes(@PathVariable Long id) {
        return R.ok(publishMapper.selectList(new LambdaQueryWrapper<AgentPublish>()
                .eq(AgentPublish::getAgentId, id)));
    }
}
