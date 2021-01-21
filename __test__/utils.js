const app = require('../app');
const supertest = require('supertest');
var user = supertest.agent(app);

async function login(username, password = username) {
  await supertest(app).post('/auth/register').send({
    username: username,
    password: password
  });
  
  var response = await user.post('/auth/login').send({username: username, password: password});
  if (response.body.success) {
    return user;
  } else {
    throw new Error('Login failed:' + JSON.stringify(response.body.info));
  }
}


module.exports = { login }
