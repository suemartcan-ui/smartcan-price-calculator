export default async function handler(req, res) {
  const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLX4ElvfcdFRFotB1ZYYs-YI-KdS4CqgTLSbzD84XUeBuqGqApjetOaA6oqpf41WCrERbMnhWY7mYx/pub?gid=393936923&single=true&output=csv";
  
  const response = await fetch(CSV_URL);
  const text = await response.text();
  
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/csv");
  res.status(200).send(text);
}
