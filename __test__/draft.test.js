const app = require('../app');
const supertest = require('supertest');
// var user = supertest.agent(app);

var utils = require('./utils');

async function createDraft(user) {
  const createResponse = await user.post('/draft/create');
  expect(createResponse.status).toBe(200)
  expect(createResponse.body.success);
  expect(createResponse.body.id);
  return createResponse.body.id;
}
 
describe("Test the draft endpoints", () => {
	it("Test creating a draft without logging in", async () => {
    const response = await supertest(app).get('/draft/create');
    expect(response.body.success).toBe(false);
  });

  it("Test creating a draft, having 8 join adding people to it", async () => {

    let host = await utils.login('test');
    let draftId = createDraft(user);
    expect(draftId).toBe


    let player = await utils.login('test');

    
    let draftInfoResponse = await user.get('/draft/info').send({draft_id: draftId});
    
    expect(draftInfoResponse.info);
    expect(draftInfoResponse.info);
  });

  it("Test register", async () => {
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