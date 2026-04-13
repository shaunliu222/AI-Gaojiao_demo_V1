package com.edu.ai.service;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.entity.ResFile;
import com.edu.ai.entity.ResFilePermission;
import com.edu.ai.entity.ResParseTask;
import com.edu.ai.mapper.ResFileMapper;
import com.edu.ai.mapper.ResFilePermissionMapper;
import com.edu.ai.mapper.ResParseTaskMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResFileService extends ServiceImpl<ResFileMapper, ResFile> {

    private final MinioService minioService;
    private final ResFilePermissionMapper permissionMapper;
    private final ResParseTaskMapper parseTaskMapper;

    @Transactional
    public ResFile uploadFile(MultipartFile file, Long categoryId, Long ownerId) {
        String storagePath = minioService.upload(file, "resources");

        ResFile resFile = new ResFile();
        resFile.setName(file.getOriginalFilename());
        resFile.setOriginalName(file.getOriginalFilename());
        resFile.setFileType(extractFileType(file.getOriginalFilename()));
        resFile.setFileSize(file.getSize());
        resFile.setStoragePath(storagePath);
        resFile.setCategoryId(categoryId);
        resFile.setOwnerId(ownerId);
        resFile.setParseStatus("pending");
        resFile.setVectorStatus("pending");
        resFile.setIsPublic(false);
        resFile.setDeleted((short) 0);
        save(resFile);

        ResParseTask task = new ResParseTask();
        task.setFileId(resFile.getId());
        task.setTaskType("parse");
        task.setStatus("pending");
        parseTaskMapper.insert(task);

        return resFile;
    }

    public IPage<ResFile> pageFiles(long page, long size, String keyword, String fileType,
                                    Long categoryId, Long userId, List<String> roleCodes) {
        LambdaQueryWrapper<ResFile> wrapper = new LambdaQueryWrapper<>();

        if (!roleCodes.contains("admin") && !roleCodes.contains("info_center")) {
            List<Long> accessibleIds = baseMapper.selectAccessibleFileIds(userId);
            if (accessibleIds.isEmpty()) {
                return new Page<>(page, size);
            }
            wrapper.in(ResFile::getId, accessibleIds);
        }

        if (StringUtils.hasText(keyword)) {
            wrapper.like(ResFile::getName, keyword);
        }
        if (StringUtils.hasText(fileType)) {
            wrapper.eq(ResFile::getFileType, fileType);
        }
        if (categoryId != null) {
            wrapper.eq(ResFile::getCategoryId, categoryId);
        }
        wrapper.orderByDesc(ResFile::getCreatedAt);
        return page(new Page<>(page, size), wrapper);
    }

    @Transactional
    public void setPublic(Long fileId, boolean isPublic) {
        lambdaUpdate().set(ResFile::getIsPublic, isPublic)
                .eq(ResFile::getId, fileId).update();
    }

    @Transactional
    public void setPermission(Long fileId, String targetType, Long targetId, String permission) {
        permissionMapper.delete(new LambdaQueryWrapper<ResFilePermission>()
                .eq(ResFilePermission::getFileId, fileId)
                .eq(ResFilePermission::getTargetType, targetType)
                .eq(ResFilePermission::getTargetId, targetId));
        ResFilePermission p = new ResFilePermission();
        p.setFileId(fileId);
        p.setTargetType(targetType);
        p.setTargetId(targetId);
        p.setPermission(permission);
        permissionMapper.insert(p);
    }

    public ResParseTask getParseStatus(Long fileId) {
        return parseTaskMapper.selectOne(new LambdaQueryWrapper<ResParseTask>()
                .eq(ResParseTask::getFileId, fileId)
                .orderByDesc(ResParseTask::getCreatedAt)
                .last("LIMIT 1"));
    }

    private String extractFileType(String filename) {
        if (filename == null || !filename.contains(".")) return "unknown";
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}
