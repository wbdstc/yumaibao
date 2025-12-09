const { MongoClient } = require('mongodb');

async function main() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db('yumaobao');
    const users = database.collection('users');
    
    const userList = await users.find().toArray();
    console.log('Users found:', userList.length);
    
    userList.forEach(user => {
      console.log('\nUser:', user.id);
      console.log('Name:', user.name);
      console.log('Phone:', user.phone);
      console.log('Role:', user.role);
      console.log('Created At:', user.createdAt);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

main();