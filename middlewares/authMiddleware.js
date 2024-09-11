import jwt from "jsonwebtoken";

// JWT 인증 미들웨어
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // 1. Authorization 헤더가 없는 경우 처리
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization 헤더가 필요합니다." });
  }
  // 2. Bearer 형식으로 전달되지 않은 경우 처리
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "올바른 Bearer 토큰 형식이 아닙니다. 'Bearer <token>' 형식을 사용하세요." });
  }
  
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "토큰이 필요합니다." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "유효하지 않은 토큰입니다." });
    }

    req.user = user; // 토큰에서 해석한 사용자 정보를 req에 추가
    next();
  });
};