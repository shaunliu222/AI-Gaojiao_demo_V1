package com.edu.ai.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.edu.ai.entity.ResFile;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.util.List;

public interface ResFileMapper extends BaseMapper<ResFile> {

    @Select("SELECT DISTINCT f.id FROM res_file f " +
            "LEFT JOIN res_file_permission p ON f.id = p.file_id " +
            "WHERE f.deleted = 0 AND (f.is_public = true OR f.owner_id = #{userId} " +
            "OR (p.target_type = 'user' AND p.target_id = #{userId}))")
    List<Long> selectAccessibleFileIds(@Param("userId") Long userId);
}
