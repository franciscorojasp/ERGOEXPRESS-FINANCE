const url = 'https://script.google.com/macros/s/AKfycbyewLsUxongldudRxZEj6J8DCNDmgc6lSzKEFVAHdMsjAe5ubnNo8yREtGsFyuV9CY2/exec';
const body = JSON.stringify({
  apiKey: 'ERGX2026',
  action: 'LOGIN',
  email: 'francisco.rojaso@gmail.com',
  password: 'admin',
  env: 'shared',
  fingerprint: ''
});

fetch(url, {
  method: 'POST',
  body: body,
  redirect: 'follow', // Fetch automatically handles redirects
  headers: {
    'Content-Type': 'text/plain;charset=utf-8' // Exact same as api.js
  }
}).then(res => res.text()).then(text => {
  console.log("Raw Response:");
  console.log(text);
  try {
    const json = JSON.parse(text);
    console.log("Parsed JSON:", json);
  } catch(e) {
    console.log("Failed to parse JSON");
  }
}).catch(console.error);
