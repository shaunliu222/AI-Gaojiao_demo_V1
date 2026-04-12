package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.entity.SysOrg;
import com.edu.ai.mapper.SysOrgMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SysOrgService extends ServiceImpl<SysOrgMapper, SysOrg> {

    public List<OrgTreeNode> getOrgTree() {
        List<SysOrg> all = list(new LambdaQueryWrapper<SysOrg>()
                .eq(SysOrg::getStatus, 1)
                .orderByAsc(SysOrg::getSortOrder));

        Map<Long, List<SysOrg>> grouped = all.stream()
                .collect(Collectors.groupingBy(o -> o.getParentId() == null ? 0L : o.getParentId()));

        return buildTree(grouped, 0L);
    }

    private List<OrgTreeNode> buildTree(Map<Long, List<SysOrg>> grouped, Long parentId) {
        List<SysOrg> children = grouped.getOrDefault(parentId, List.of());
        List<OrgTreeNode> nodes = new ArrayList<>();
        for (SysOrg org : children) {
            OrgTreeNode node = new OrgTreeNode();
            node.setId(org.getId());
            node.setName(org.getName());
            node.setCode(org.getCode());
            node.setType(org.getType());
            node.setChildren(buildTree(grouped, org.getId()));
            nodes.add(node);
        }
        return nodes;
    }

    @lombok.Data
    public static class OrgTreeNode {
        private Long id;
        private String name;
        private String code;
        private String type;
        private List<OrgTreeNode> children;
    }
}
