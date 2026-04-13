package com.edu.ai.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.edu.ai.common.R;
import com.edu.ai.entity.McpServer;
import com.edu.ai.mapper.McpServerMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "MCP Server Management")
@RestController
@RequestMapping("/api/mcp-servers")
@RequiredArgsConstructor
public class McpServerController {

    private final McpServerMapper mcpMapper;

    @Operation(summary = "List MCP servers")
    @GetMapping
    public R<List<McpServer>> list() {
        return R.ok(mcpMapper.selectList(new LambdaQueryWrapper<McpServer>()
                .orderByDesc(McpServer::getCreatedAt)));
    }

    @Operation(summary = "Create MCP server")
    @PostMapping
    public R<McpServer> create(@RequestBody McpServer server) {
        server.setOwnerId(StpUtil.getLoginIdAsLong());
        if (server.getStatus() == null) server.setStatus("active");
        if (server.getIsPublic() == null) server.setIsPublic(false);
        server.setDeleted((short) 0);
        mcpMapper.insert(server);
        return R.ok(server);
    }

    @Operation(summary = "Update MCP server")
    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @RequestBody McpServer server) {
        server.setId(id);
        mcpMapper.updateById(server);
        return R.ok();
    }

    @Operation(summary = "Delete MCP server")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        mcpMapper.deleteById(id);
        return R.ok();
    }
}
