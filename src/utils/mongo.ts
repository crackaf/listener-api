import mongoose from 'mongoose';

export const connectToDB = async () => {
  const uri = process.env.MONGO_URI;
  mongoose
    .connect(uri)
    .then(() => console.log('Database connected!'))
    .catch((err) => console.log(err));
};
