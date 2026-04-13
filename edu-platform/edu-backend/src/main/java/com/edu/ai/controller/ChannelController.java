package com.edu.ai.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.annotation.SaMode;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.edu.ai.common.R;
import com.edu.ai.entity.ChannelAgentBinding;
import com.edu.ai.entity.ChannelConfig;
import com.edu.ai.mapper.ChannelAgentBindingMapper;
import com.edu.ai.mapper.ChannelConfigMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Channel Management")
@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelConfigMapper channelMapper;
    private final ChannelAgentBindingMapper bindingMapper;

    @Operation(summary = "List channels")
    @GetMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<List<ChannelConfig>> list() {
        return R.ok(channelMapper.selectList(new LambdaQueryWrapper<ChannelConfig>()
                .orderByDesc(ChannelConfig::getCreatedAt)));
    }

    @Operation(summary = "Create channel")
    @PostMapping
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<ChannelConfig> create(@RequestBody ChannelConfig channel) {
        if (channel.getStatus() == null) channel.setStatus("active");
        channelMapper.insert(channel);
        return R.ok(channel);
    }

    @Operation(summary = "Update channel")
    @PutMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> update(@PathVariable Long id, @RequestBody ChannelConfig channel) {
        channel.setId(id);
        channelMapper.updateById(channel);
        return R.ok();
    }

    @Operation(summary = "Delete channel")
    @DeleteMapping("/{id}")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> delete(@PathVariable Long id) {
        channelMapper.deleteById(id);
        bindingMapper.delete(new LambdaQueryWrapper<ChannelAgentBinding>()
                .eq(ChannelAgentBinding::getChannelId, id));
        return R.ok();
    }

    @Operation(summary = "Bind agent to channel")
    @PostMapping("/{id}/bind-agent")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> bindAgent(@PathVariable Long id, @RequestParam Long agentId) {
        ChannelAgentBinding binding = new ChannelAgentBinding();
        binding.setChannelId(id);
        binding.setAgentId(agentId);
        bindingMapper.insert(binding);
        return R.ok();
    }

    @Operation(summary = "Unbind agent from channel")
    @DeleteMapping("/{id}/unbind-agent")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<Void> unbindAgent(@PathVariable Long id, @RequestParam Long agentId) {
        bindingMapper.delete(new LambdaQueryWrapper<ChannelAgentBinding>()
                .eq(ChannelAgentBinding::getChannelId, id)
                .eq(ChannelAgentBinding::getAgentId, agentId));
        return R.ok();
    }

    @Operation(summary = "Get channel bindings")
    @GetMapping("/{id}/bindings")
    @SaCheckRole(value = {"admin", "info_center"}, mode = SaMode.OR)
    public R<List<ChannelAgentBinding>> bindings(@PathVariable Long id) {
        return R.ok(bindingMapper.selectList(new LambdaQueryWrapper<ChannelAgentBinding>()
                .eq(ChannelAgentBinding::getChannelId, id)));
    }
}
