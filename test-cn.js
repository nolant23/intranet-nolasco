const https = require('https');
const token = process.env.FIC_ACCESS_TOKEN ? process.env.FIC_ACCESS_TOKEN.replace('Bearer ', '') : "a/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWYiOiI2elFacTFobnFWb2I5aFdyN3B5b2JRSU5BVVdXaEgyVCJ9.X2HJWJ30Ga1r-7dmE6aY3Fyxpj3xaFOfCPfrOSWrSw8";
const companyId = process.env.FIC_COMPANY_ID || "42620";

const options = {
  hostname: 'api-v2.fattureincloud.it',
  path: `/c/${companyId}/issued_documents?type=credit_note&fieldset=detailed&per_page=1`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if(json.data && json.data.length > 0) {
      console.log(JSON.stringify(json.data[0], null, 2));
    } else {
      console.log("No data");
    }
  });
});
req.end();
