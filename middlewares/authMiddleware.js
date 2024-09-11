import jwt from "jsonwebtoken";

// JWT 인증 미들웨어
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
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