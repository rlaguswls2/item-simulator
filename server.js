import express from 'express';
import dotenv from 'dotenv';
import characterRoutes from './routes/character.js'
import authRoutes from './routes/auth.js'; // 회원가입 라우터 가져오기

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();


app.use(express.json()); // body-parser 대체
// 회원가입 라우트를 포함한 auth 경로
app.use('/auth', authRoutes);
app.use('/characters', characterRoutes);

app.get('/', (req, res) => {
  res.send('Item Simulator API is running!');
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
