import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// 회원가입 API
router.post("/signup", async (req, res) => {
  const { username, password, confirmPassword, name } = req.body;

  // 1. 입력 데이터 유효성 검사
  if (!username || !password || !confirmPassword || !name) {
    return res.status(400).json({ error: "모든 필드를 입력해주세요." });
  }

  // 2. 아이디 유효성 검사: 영어 소문자 + 숫자 조합인지 확인
  const isValidUsername = /^[a-z0-9]+$/.test(username);
  if (!isValidUsername) {
    return res
      .status(400)
      .json({ error: "아이디는 영어 소문자와 숫자만 가능합니다." });
  }

  // 3. 비밀번호 유효성 검사: 6자 이상인지 확인
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "비밀번호는 최소 6자 이상이어야 합니다." });
  }

  // 4. 비밀번호 확인과 일치하는지 확인
  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ error: "비밀번호 확인이 일치하지 않습니다." });
  }

  // 5. 아이디 중복 체크
  const existingUser = await prisma.account.findUnique({
    where: { username },
  });

  if (existingUser) {
    return res.status(409).json({ error: "이미 존재하는 아이디입니다." });
  }

  // 6. 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // 7. 사용자 저장
    const newUser = await prisma.account.create({
      data: {
        username,
        password: hashedPassword,
        name,
      },
    });

    // 8. 성공적으로 생성된 사용자 정보(비밀번호 제외) 반환
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
    });
  } catch (error) {
    res.status(500).json({ error: "회원가입 중 오류가 발생했습니다." });
  }
});

export default router;
