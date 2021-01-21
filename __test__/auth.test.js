const app = require('../app');
const supertest = require('supertest');
var user = supertest.agent(app);

describe("Test the auth endpoints", () => {

	it("Test /auth/info without login", async () => {

		const response = await supertest(app).get('/auth/info');

		expect(response.status).toBe(200)
    expect(response.body.authenticated).toBe(false);
    expect(!response.body.username);
  });

  it("Test /auth/register", async () => {
    const registerResponse = await supertest(app).post('/auth/register').send({
      username: 'test',
      password: 'test'
    });
    
    user
      .post('/auth/login')
      .send({username: 'test', password: 'test'})
      .end(function(err, loginResponse) {
        expect(!err);
        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        
        user.get('/auth/info').end(function(err, infoResponse) {
          expect(infoResponse.status).toBe(200)
          expect(infoResponse.body.authenticated).toBe(true);
          expect(infoResponse.body.username).toBe('test');
        });
      });
  });
  
  it("Test Login then logout", async () => {
    await supertest(app).post('/auth/register').send({
      username: 'test',
      password: 'test'
    });
    
    var loginResponse = await user
      .post('/auth/login')
      .send({username: 'test', password: 'test'});

    expect(loginResponse);
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);

    expect(await isAuthenticated('test'));
    
    var logoutResponse = await user.post('/auth/logout');
    expect(logoutResponse);
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success);

    expect(!await isAuthenticated('test'));
  });
  
  async function isAuthenticated(username) {
    var infoResponse = await user.get('/auth/info');
    return infoResponse 
      && infoResponse.status == 200 
      && infoResponse.body.authenticated 
      && infoResponse.body.username == 'test';
  }
});