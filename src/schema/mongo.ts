import mongoose from 'mongoose';

export const connectToDB = async () => {
  const uri =
    'mongodb+srv://bubbles:KseTfjRc4rOlgQXK@bubbles-project.vus3i.mongodb.net/listenerDatabase?retryWrites=true&w=majority';
  mongoose
    .connect(uri)
    .then(() => console.log('Database connected!'))
    .catch((err) => console.log(err));
};
