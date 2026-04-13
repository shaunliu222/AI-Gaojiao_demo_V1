package com.edu.ai.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.edu.ai.common.R;
import com.edu.ai.entity.SkillDefinition;
import com.edu.ai.mapper.SkillDefinitionMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Skill Management")
@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillDefinitionMapper skillMapper;

    @Operation(summary = "List skills")
    @GetMapping
    public R<List<SkillDefinition>> list(
            @RequestParam(required = false) String skillType,
            @RequestParam(required = false) Boolean isPublic) {
        LambdaQueryWrapper<SkillDefinition> wrapper = new LambdaQueryWrapper<>();
        if (skillType != null) wrapper.eq(SkillDefinition::getSkillType, skillType);
        if (isPublic != null) wrapper.eq(SkillDefinition::getIsPublic, isPublic);
        wrapper.orderByDesc(SkillDefinition::getCreatedAt);
        return R.ok(skillMapper.selectList(wrapper));
    }

    @Operation(summary = "Create skill")
    @PostMapping
    public R<SkillDefinition> create(@RequestBody SkillDefinition skill) {
        skill.setOwnerId(StpUtil.getLoginIdAsLong());
        if (skill.getStatus() == null) skill.setStatus((short) 1);
        if (skill.getIsPublic() == null) skill.setIsPublic(false);
        skill.setDeleted((short) 0);
        skillMapper.insert(skill);
        return R.ok(skill);
    }

    @Operation(summary = "Update skill")
    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @RequestBody SkillDefinition skill) {
        skill.setId(id);
        skillMapper.updateById(skill);
        return R.ok();
    }

    @Operation(summary = "Delete skill")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        skillMapper.deleteById(id);
        return R.ok();
    }
}
