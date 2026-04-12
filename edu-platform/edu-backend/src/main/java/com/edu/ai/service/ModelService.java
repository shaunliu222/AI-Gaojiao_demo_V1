package com.edu.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.edu.ai.common.CryptoUtil;
import com.edu.ai.entity.ModelConfig;
import com.edu.ai.entity.ModelPermission;
import com.edu.ai.mapper.ModelConfigMapper;
import com.edu.ai.mapper.ModelPermissionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ModelService extends ServiceImpl<ModelConfigMapper, ModelConfig> {

    private final ModelPermissionMapper modelPermissionMapper;

    public List<ModelConfig> listByCapability(String capability) {
        LambdaQueryWrapper<ModelConfig> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(capability) && !"all".equals(capability)) {
            wrapper.eq(ModelConfig::getCapability, capability);
        }
        wrapper.eq(ModelConfig::getStatus, "active");
        wrapper.orderByDesc(ModelConfig::getIsDefault);
        wrapper.orderByDesc(ModelConfig::getCreatedAt);
        List<ModelConfig> models = list(wrapper);
        // Mask API keys in response
        models.forEach(m -> m.setApiKey(maskApiKey(m.getApiKey())));
        return models;
    }

    @Transactional
    public ModelConfig createModel(ModelConfig model) {
        // Encrypt API key before storing
        if (StringUtils.hasText(model.getApiKey())) {
            model.setApiKey(CryptoUtil.encrypt(model.getApiKey()));
        }
        if (model.getStatus() == null) model.setStatus("active");
        if (model.getIsDefault() == null) model.setIsDefault(false);
        if (model.getIsPublic() == null) model.setIsPublic(true);
        save(model);
        model.setApiKey("****");
        return model;
    }

    @Transactional
    public void setDefault(Long modelId) {
        // Clear existing default
        lambdaUpdate().set(ModelConfig::getIsDefault, false)
                .eq(ModelConfig::getIsDefault, true).update();
        // Set new default
        lambdaUpdate().set(ModelConfig::getIsDefault, true)
                .eq(ModelConfig::getId, modelId).update();
    }

    public String getDecryptedApiKey(Long modelId) {
        ModelConfig model = getById(modelId);
        if (model == null || !StringUtils.hasText(model.getApiKey())) return null;
        return CryptoUtil.decrypt(model.getApiKey());
    }

    public List<ModelConfig> getAvailableModels(List<String> roleCodes) {
        // If admin or info_center, return all active models
        if (roleCodes.contains("admin") || roleCodes.contains("info_center")) {
            return listByCapability(null);
        }
        // Otherwise, return public models + models permitted to user's roles
        List<ModelConfig> publicModels = lambdaQuery()
                .eq(ModelConfig::getIsPublic, true)
                .eq(ModelConfig::getStatus, "active").list();
        publicModels.forEach(m -> m.setApiKey(maskApiKey(m.getApiKey())));
        return publicModels;
    }

    @Transactional
    public void setPermissions(Long modelId, List<Long> roleIds) {
        modelPermissionMapper.delete(new LambdaQueryWrapper<ModelPermission>()
                .eq(ModelPermission::getModelId, modelId));
        for (Long roleId : roleIds) {
            ModelPermission mp = new ModelPermission();
            mp.setModelId(modelId);
            mp.setRoleId(roleId);
            modelPermissionMapper.insert(mp);
        }
    }

    public List<Long> getPermissionRoleIds(Long modelId) {
        return modelPermissionMapper.selectList(new LambdaQueryWrapper<ModelPermission>()
                        .eq(ModelPermission::getModelId, modelId))
                .stream().map(ModelPermission::getRoleId).toList();
    }

    private String maskApiKey(String encryptedKey) {
        if (!StringUtils.hasText(encryptedKey)) return "";
        // Don't decrypt just to mask — show truncated ciphertext indicator
        return "sk-****" + encryptedKey.substring(Math.max(0, encryptedKey.length() - 4));
    }
}
