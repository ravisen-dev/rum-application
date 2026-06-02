const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();

pptx.defineLayout({ name:'LAYOUT', width:13.33, height:7.5 });
pptx.layout = 'LAYOUT';

function addSlide(title, bullets) {
  let slide = pptx.addSlide();
  slide.addText(title, { x:0.5, y:0.5, fontSize:36, bold:true, color:'363636' });
  slide.addText(bullets.map((b, i) => `${i+1}. ${b}`).join('\n'), {
    x:0.5,
    y:1.5,
    fontSize:24,
    color:'505050',
    lineSpacing:28,
    bullet:false
  });
}

let slide = pptx.addSlide();
slide.addText('Real User Monitoring (RUM) Solution', { x:0.5, y:1.0, fontSize:44, bold:true, color:'003366' });
slide.addText('Business overview, benefits, application flow, architecture, and technology stack.', { x:0.5, y:2.2, fontSize:24, color:'505050', wrap:true, w:12.3 });

addSlide('Why RUM Matters', [
  'RUM captures real user behavior and performance in production.',
  'Provides visibility into actual user experience, not just backend metrics.',
  'Helps prioritize improvements based on real customer impact.',
  'Supports faster problem resolution with actionable insights.'
]);

addSlide('Benefits over Traditional Observability', [
  'Real User Monitoring focuses on customer experience rather than system metrics.',
  'Traditional tools like Grafana visualize infrastructure metrics, but RUM shows front-end latency, page load, and errors in context.',
  'RUM identifies problems in the application path that observability dashboards may miss.',
  'Combines behavioral telemetry, performance, errors, and network activity in one view.'
]);

addSlide('Applications Flow', [
  'User interacts with the frontend application.',
  'RUM SDK collects page views, network requests, errors, web vitals, and custom events.',
  'Telemetry is sent to the backend RUM API ingestion endpoint.',
  'Backend stores and processes telemetry data for analysis.',
  'Dashboard presents aggregated application insights to stakeholders.'
]);

addSlide('Architecture Overview', [
  'Frontend apps use the RUM SDK to instrument user activity.',
  'RUM API backend ingests telemetry and stores it in PostgreSQL.',
  'Dashboard reads telemetry from the backend API for visualization.',
  'CORS-enabled local dev setup supports web apps and dashboard on separate ports.'
]);

addSlide('Technology Stack', [
  'rum-api: ASP.NET Core Minimal API, EF Core, PostgreSQL.',
  'rum-dashboard: Angular 21 frontend dashboard.',
  'rum-sdk: TypeScript SDK for browser telemetry collection.',
  'rum-sdk-todos: Angular sample app demonstrating SDK integration.',
  'Dev tools: Node.js, npm, dotnet, TypeScript, Angular CLI.'
]);

pptx.writeFile({ fileName:'RUM-Business-Deck.pptx' }).then(() => {
  console.log('Created RUM-Business-Deck.pptx');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
