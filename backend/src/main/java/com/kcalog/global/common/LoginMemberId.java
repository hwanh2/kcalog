package com.kcalog.global.common;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** 컨트롤러 파라미터에 JWT subject(회원 id)를 주입한다. Jwt→memberId 추출 중복을 한 곳으로 모은다 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface LoginMemberId {
}
