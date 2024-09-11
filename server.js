import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth.js'; // 회원가입 라우터 가져오기

const app = express();
const port = 3000;

app.use(bodyParser.json());

// 회원가입 라우트를 포함한 auth 경로
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Item Simulator API is running!');
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
