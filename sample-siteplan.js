/**
 * Sample Siteplan Generator (sample-siteplan.js)
 * Generates an SVG Masterplan layout to draw on canvas if no PDF is uploaded.
 */

window.SampleSiteplan = (function () {
  'use strict';

  function drawSampleSiteplan(ctx, width, height) {
    // Fill background (Grass/Landscape color)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Site boundary grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer Perimeter Boundary
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(40, 40, width - 80, height - 80);
    ctx.setLineDash([]);

    // Main Roads
    ctx.fillStyle = '#334155';
    // Boulevard horizontal
    ctx.fillRect(40, height / 2 - 25, width - 80, 50);
    // Vertical avenue
    ctx.fillRect(width / 2 - 25, 40, 50, height - 80);

    // Road Line Markings
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(40, height / 2);
    ctx.lineTo(width - 40, height / 2);
    ctx.stroke();
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(width / 2, 40);
    ctx.lineTo(width / 2, height - 40);
    ctx.stroke();
    ctx.setLineDash([]);

    // Roundabout / Central Plaza
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 45, 0, Math.PI * 2);
    ctx.fill();

    // Zone Blocks Backgrounds
    const blocks = [
      { name: 'BLOK A - RESIDENTIAL / KAVLING A', x: 70, y: 70, w: width / 2 - 120, h: height / 2 - 120, color: 'rgba(16, 185, 129, 0.1)', border: '#10b981' },
      { name: 'BLOK B - EXECUTIVE SUITES', x: width / 2 + 50, y: 70, w: width / 2 - 120, h: height / 2 - 120, color: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' },
      { name: 'BLOK C - GARDEN PARALLEL', x: 70, y: height / 2 + 50, w: width / 2 - 120, h: height / 2 - 120, color: 'rgba(168, 85, 247, 0.1)', border: '#a855f7' },
      { name: 'BLOK D - PREMIUM HILLS', x: width / 2 + 50, y: height / 2 + 50, w: width / 2 - 120, h: height / 2 - 120, color: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b' }
    ];

    blocks.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = b.border;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Block Label
      ctx.fillStyle = b.border;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(b.name, b.x + 15, b.y + 25);
    });

    // Water feature / Park Pond
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(width - 150, height - 150, 70, 45, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '11px sans-serif';
    ctx.fillText('Danau Resapan', width - 180, height - 145);

    // Siteplan Title Header Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(50, height - 90, 260, 45);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, height - 90, 260, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('SAMPLE MASTERPLAN SITEPLAN', 60, height - 70);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Skala 1:500 | Mode Canvas Demo Interactive', 60, height - 55);
  }

  function getDefaultSampleNodes(width, height) {
    return [
      {
        id: 'node-1',
        code: 'A-01',
        title: 'Kavling Huni A-01',
        category: 'KAVLING',
        status: 'AVAILABLE',
        x: 120,
        y: 130,
        dimension: '10m x 15m',
        area: '150',
        price: '750,000,000',
        properties: [
          { key: 'Sertifikat', value: 'SHM' },
          { key: 'Hadap', value: 'Utara' },
          { key: 'Daya Listrik', value: '2200 VA' }
        ]
      },
      {
        id: 'node-2',
        code: 'A-02',
        title: 'Kavling Huni A-02',
        category: 'KAVLING',
        status: 'BOOKED',
        x: 200,
        y: 130,
        dimension: '10m x 15m',
        area: '150',
        price: '750,000,000',
        properties: [
          { key: 'Pemesan', value: 'Bpk. Hendra' },
          { key: 'DP Paid', value: 'Rp 50.000.000' },
          { key: 'Batas Pelunasan', value: '30 Sept 2026' }
        ]
      },
      {
        id: 'node-3',
        code: 'A-03',
        title: 'Kavling Sudut A-03',
        category: 'KAVLING',
        status: 'SOLD',
        x: 280,
        y: 130,
        dimension: '12m x 15m',
        area: '180',
        price: '920,000,000',
        properties: [
          { key: 'Pemilik', value: 'Ibu Ratna' },
          { key: 'No. Sertifikat', value: 'SHM No. 4819' },
          { key: 'Status Bangunan', value: 'Tahap Desain' }
        ]
      },
      {
        id: 'node-4',
        code: 'FAS-01',
        title: 'Plaza & Central Garden',
        category: 'FASILITAS',
        status: 'RESERVED',
        x: width / 2,
        y: height / 2,
        dimension: 'Diameter 90m',
        area: '6360',
        price: '-',
        properties: [
          { key: 'Pengelola', value: 'Management Estate' },
          { key: 'Fasilitas', value: 'Air Mancur, Gazebo, WiFi Zone' }
        ]
      },
      {
        id: 'node-5',
        code: 'B-10',
        title: 'Kavling Hook B-10',
        category: 'KAVLING',
        status: 'AVAILABLE',
        x: width / 2 + 120,
        y: 140,
        dimension: '15m x 20m',
        area: '300',
        price: '1,650,000,000',
        properties: [
          { key: 'Sertifikat', value: 'HGB Induk' },
          { key: 'View', value: 'Taman Utama' }
        ]
      }
    ];
  }

  return {
    drawSampleSiteplan: drawSampleSiteplan,
    getDefaultSampleNodes: getDefaultSampleNodes
  };
})();
