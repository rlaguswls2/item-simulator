import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// 회원가입 API
router.post("/signup", async (req, res) => {
  const { username, password, confirmPassword} = req.body;

  // 1. 입력 데이터 유효성 검사
  if (!username || !password || !confirmPassword) {
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
        password: hashedPassword
      },
    });

    // 8. 성공적으로 생성된 사용자 정보(비밀번호 제외) 반환
    res.status(201).json({
      id: newUser.id,
      username: newUser.username
    });
  } catch (error) {
    console.error("회원가입 중 발생한 오류:", error); 
    res.status(500).json({ error: "회원가입 중 오류가 발생했습니다." });
  }
});


// 로그인 API
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "아이디와 비밀번호를 입력해주세요." });
  }

  try {
    const user = await prisma.account.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(404).json({ error: "존재하지 않는 아이디입니다." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "비밀번호가 틀렸습니다." });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    res.status(200).json({
      message: "로그인 성공",
      token,
    });
  } catch (error) {
    console.error("로그인 중 오류 발생:", error);
    res.status(500).json({ error: "로그인 중 오류가 발생했습니다." });
  }
});

export default router;
