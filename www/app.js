<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover">
  <title>LCMTV – Live & Recorded | Mux Powered</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Poppins', sans-serif; background: #000; color: #fff; overflow-x: hidden; }

    .preloader { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #0a0a0f, #1a1a2a); display: flex; align-items: center; justify-content: center; z-index: 9999; transition: opacity 0.5s; }
    .preloader.hide { opacity: 0; pointer-events: none; }
    .loader-logo { width: 100px; margin: 0 auto 20px; animation: pulse 1.5s infinite; }
    .loader-logo img { width: 100%; border-radius: 25px; }
    .loader-text { font-family: 'Montserrat', sans-serif; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #ff6600, #ff8533); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .loader-spinner { width: 45px; height: 45px; border: 3px solid rgba(255,102,0,0.2); border-top-color: #ff6600; border-radius: 50%; margin: 20px auto 0; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }

    .app-container { max-width: 100%; min-height: 100vh; background: #000; position: relative; display: flex; flex-direction: column; }
    .screen { display: none; flex: 1; }
    .screen.active { display: block; }

    .auth-screen { padding: 40px 24px; background: linear-gradient(135deg, #0a0a0f, #1a1a2a); min-height: 100vh; }
    .auth-header { text-align: center; margin-bottom: 40px; }
    .company-logo { width: 120px; height: 120px; object-fit: contain; margin: 0 auto 20px; border-radius: 30px; background: rgba(255,102,0,0.1); padding: 10px; }
    .logo-text { font-family: 'Montserrat', sans-serif; font-size: 36px; font-weight: 800; }
    .highlight { color: #ff6600; }
    .subtitle { color: #888; font-size: 14px; margin-top: 8px; }
    .auth-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border-radius: 24px; padding: 30px; border: 1px solid rgba(255,255,255,0.1); }
    .input-group { position: relative; margin-bottom: 20px; }
    .input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #ff6600; z-index: 1; }
    input, select { width: 100%; padding: 16px 16px 16px 48px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; color: white; font-size: 16px; font-family: 'Inter', sans-serif; }
    select { appearance: none; -webkit-appearance: none; cursor: pointer; }
    .phone-group { display: flex; align-items: center; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; position: relative; }
    .phone-group .input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); z-index: 2; }
    .country-code-prefix { display: inline-block; padding: 16px 0 16px 48px; color: #ff6600; font-weight: 500; background: transparent; border: none; font-size: 16px; white-space: nowrap; font-family: 'Inter', sans-serif; }
    .phone-group input { flex: 1; padding: 16px 16px 16px 8px; background: transparent; border: none; color: white; font-size: 16px; outline: none; }
    .btn-primary { width: 100%; padding: 16px; background: linear-gradient(135deg, #ff6600, #ff8533); border: none; border-radius: 16px; color: white; font-weight: 600; cursor: pointer; margin-top: 10px; font-size: 16px; font-family: 'Poppins', sans-serif; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .auth-footer { text-align: center; margin-top: 24px; font-size: 12px; color: #888; }
    .auth-footer a { color: #ff6600; }

    .stream-screen { background: #000; min-height: 100vh; padding-bottom: 80px; }
    .main-header { position: sticky; top: 0; background: rgba(0,0,0,0.95); backdrop-filter: blur(15px); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; z-index: 100; border-bottom: 1px solid rgba(255,102,0,0.1); }
    .logo-area { display: flex; align-items: center; gap: 10px; }
    .logo-area img { height: 40px; width: auto; border-radius: 8px; }
    .logo-area span { font-family: 'Montserrat', sans-serif; font-size: 22px; font-weight: 800; }
    .logo-area span:first-child { color: white; }
    .logo-area span:last-child { color: #ff6600; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .viewer-badge { background: rgba(255,102,0,0.15); border: 1px solid #ff6600; padding: 6px 12px; border-radius: 20px; font-size: 12px; display: flex; align-items: center; gap: 6px; font-family: 'Poppins', sans-serif; font-weight: 500; cursor: pointer; position: relative; }
    .viewer-badge:hover .viewer-tooltip { display: block; }
    .viewer-tooltip { display: none; position: absolute; top: 100%; right: 0; background: #1a1a2a; border: 1px solid #ff6600; border-radius: 8px; padding: 8px 12px; font-size: 11px; white-space: nowrap; z-index: 200; margin-top: 5px; color: #ffcc99; }
    .live-dot { width: 8px; height: 8px; background: #ff6600; border-radius: 50%; animation: pulse 1.5s infinite; }
    .user-profile { width: 40px; height: 40px; background: linear-gradient(135deg, #ff6600, #ff8533); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; font-family: 'Poppins', sans-serif; }

    .video-wrapper { background: #000; position: relative; width: 100%; aspect-ratio: 16/9; }
    video { width: 100%; height: 100%; object-fit: contain; background: #000; }
    .video-controls { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 12px; display: flex; gap: 10px; align-items: center; opacity: 0; transition: opacity 0.3s; flex-wrap: wrap; z-index: 20; }
    .video-wrapper:hover .video-controls { opacity: 1; }
    .video-controls button, .quality-dropdown { background: rgba(0,0,0,0.6); border: none; color: white; border-radius: 30px; padding: 8px 12px; cursor: pointer; font-size: 13px; font-family: 'Inter', sans-serif; }
    .quality-dropdown { position: relative; display: inline-flex; align-items: center; gap: 4px; }
    .quality-dropdown .current-quality { font-weight: 500; font-size: 12px; }
    .quality-menu { position: absolute; bottom: 44px; right: 0; background: rgba(20,20,30,0.95); border-radius: 12px; padding: 8px 0; min-width: 100px; display: none; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.6); }
    .quality-menu.show { display: flex; }
    .quality-option { padding: 8px 16px; cursor: pointer; font-size: 13px; white-space: nowrap; color: #ccc; transition: background 0.2s; }
    .quality-option:hover { background: rgba(255,102,0,0.2); color: white; }
    .quality-option.active { color: #ff6600; font-weight: 600; }
    .video-controls input { background: rgba(0,0,0,0.6); border: none; color: white; border-radius: 30px; padding: 8px 12px; cursor: pointer; font-size: 14px; }
    .stream-status { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.6); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; z-index: 10; font-family: 'Poppins', sans-serif; }
    .live-indicator { background: #ff6600; color: white; }
    .offline-indicator { background: #ef4444; color: white; }

    .stream-info { padding: 16px 20px; background: #0a0a0f; }
    .stream-title { font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 700; }
    .stream-stats { display: flex; gap: 16px; margin-top: 8px; font-size: 13px; color: #aaa; flex-wrap: wrap; font-family: 'Inter', sans-serif; }
    .stream-stats span { display: inline-flex; align-items: center; gap: 4px; }
    .stream-stats strong { color: #fff; font-family: 'Poppins', sans-serif; }
    .reaction-bar { display: flex; gap: 8px; margin-top: 12px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); }
    .reaction-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 12px; cursor: pointer; transition: all 0.3s; background: transparent; border: none; color: #aaa; font-size: 14px; font-family: 'Inter', sans-serif; }
    .reaction-btn:hover { background: rgba(255,102,0,0.1); color: #ff6600; }
    .reaction-btn.liked { color: #ff4444; }
    .reaction-btn.liked i { animation: heartBeat 0.3s ease; }
    @keyframes heartBeat { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
    .reaction-count { font-weight: 600; font-family: 'Poppins', sans-serif; }

    .section { margin: 20px 0; padding: 0 16px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .section-header h3 { font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 600; }
    .section-header .refresh-btn { color: #ff6600; font-size: 13px; cursor: pointer; background: none; border: none; font-family: 'Inter', sans-serif; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; }
    .see-all { color: #ff6600; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500; }
    .horizontal-scroll { display: flex; overflow-x: auto; gap: 12px; padding-bottom: 8px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
    .horizontal-scroll::-webkit-scrollbar { height: 4px; }
    .horizontal-scroll::-webkit-scrollbar-thumb { background: #ff6600; border-radius: 4px; }

    .program-card { min-width: 260px; background: #1a1a2a; border-radius: 16px; overflow: hidden; cursor: pointer; scroll-snap-align: start; transition: transform 0.2s; }
    .program-card:hover { transform: translateY(-2px); }
    .program-thumb { width: 100%; height: 140px; background: linear-gradient(145deg, #2a2a3a, #1a1a2a); position: relative; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #ff6600; }
    .time-badge { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); padding: 4px 8px; border-radius: 20px; font-size: 10px; font-family: 'Inter', sans-serif; }
    .program-info { padding: 12px; }
    .program-title { font-family: 'Poppins', sans-serif; font-weight: 600; margin-bottom: 4px; font-size: 15px; }
    .program-desc { font-family: 'Inter', sans-serif; font-size: 12px; color: #aaa; }
    .program-schedule { font-family: 'Inter', sans-serif; font-size: 11px; color: #ff6600; margin-top: 4px; font-weight: 500; }

    .event-card { min-width: 220px; background: #1a1a2a; border-radius: 16px; overflow: hidden; cursor: pointer; scroll-snap-align: start; border: 1px solid rgba(255,102,0,0.2); }
    .event-date-badge { background: #ff6600; color: white; padding: 8px 12px; text-align: center; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 12px; }
    .event-info { padding: 12px; }
    .event-title { font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .event-desc { font-family: 'Inter', sans-serif; font-size: 12px; color: #aaa; }
    .event-countdown { font-family: 'Inter', sans-serif; font-size: 11px; color: #ff6600; margin-top: 6px; font-weight: 500; }

    .gallery-card { min-width: 200px; background: #1a1a2a; border-radius: 16px; overflow: hidden; cursor: pointer; transition: transform 0.3s; scroll-snap-align: start; position: relative; }
    .gallery-card:hover { transform: translateY(-2px); }
    .gallery-card img { width: 100%; height: 180px; object-fit: cover; background: #0d0d1a; }
    .gallery-card .gallery-info { padding: 12px; }
    .gallery-card .gallery-title { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .gallery-card .gallery-desc { font-family: 'Inter', sans-serif; font-size: 12px; color: #aaa; }

    .comments-section { background: #1a1a2a; border-radius: 16px; padding: 16px; margin: 12px 16px; }
    .comments-header { font-family: 'Poppins', sans-serif; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .comment-item { display: flex; gap: 10px; margin-bottom: 12px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 12px; }
    .comment-avatar { width: 32px; height: 32px; background: #ff6600; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; flex-shrink: 0; font-family: 'Poppins', sans-serif; }
    .comment-content { flex: 1; }
    .comment-user { font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13px; color: #ff6600; }
    .comment-text { font-family: 'Inter', sans-serif; font-size: 13px; margin-top: 2px; }
    .comment-time { font-family: 'Inter', sans-serif; font-size: 10px; color: #666; margin-top: 4px; }
    .comment-input-container { display: flex; gap: 8px; margin-top: 12px; }
    .comment-input-container input { flex: 1; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 25px; padding: 10px 16px; color: white; font-family: 'Inter', sans-serif; }
    .comment-input-container button { background: #ff6600; border: none; border-radius: 25px; padding: 10px 16px; color: white; cursor: pointer; }

    .share-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); display: none; align-items: center; justify-content: center; z-index: 500; }
    .share-modal.active { display: flex; }
    .share-card { background: #1a1a2a; border-radius: 24px; padding: 24px; width: 340px; max-width: 90%; border: 1px solid rgba(255,102,0,0.3); }
    .share-card h3 { text-align: center; margin-bottom: 20px; font-size: 18px; font-family: 'Poppins', sans-serif; }
    .share-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .share-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; padding: 12px; border-radius: 12px; transition: background 0.3s; }
    .share-item:hover { background: rgba(255,102,0,0.2); }
    .share-item i { font-size: 28px; }
    .share-item span { font-family: 'Inter', sans-serif; font-size: 10px; }
    .close-share { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; }

    .video-card { background: #1a1a2a; border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
    .video-card:hover { transform: translateY(-2px); }
    .video-thumb { width: 100%; aspect-ratio: 16/9; background: #2a2a3a; position: relative; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #ff6600; }
    .duration-badge { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-family: 'Inter', sans-serif; }
    .video-info { padding: 8px; }
    .video-title { font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .video-meta { font-family: 'Inter', sans-serif; font-size: 11px; color: #aaa; }
    .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }

    .bottom-tabs { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(10,10,15,0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-around; align-items: center; padding: 8px 0 16px; z-index: 100; }
    .tab-item { display: flex; flex-direction: column; align-items: center; gap: 4px; color: #888; font-size: 12px; cursor: pointer; transition: color 0.2s; font-family: 'Inter', sans-serif; }
    .tab-item i { font-size: 22px; }
    .tab-item.active { color: #ff6600; }

    .profile-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(15px); display: none; align-items: center; justify-content: center; z-index: 300; }
    .profile-modal.active { display: flex; }
    .profile-card { background: #1a1a2a; border-radius: 30px; padding: 30px; width: 300px; text-align: center; border: 1px solid #ff6600; }
    .profile-avatar { width: 80px; height: 80px; background: #ff6600; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 20px; font-family: 'Poppins', sans-serif; font-weight: bold; }
    .profile-name { font-family: 'Poppins', sans-serif; font-size: 20px; font-weight: bold; margin-bottom: 10px; }
    .profile-phone { font-family: 'Inter', sans-serif; color: #aaa; margin-bottom: 20px; }
    .logout-btn { background: rgba(255,68,68,0.2); border: 1px solid #ff4444; padding: 10px 20px; border-radius: 30px; color: white; cursor: pointer; font-size: 14px; font-family: 'Poppins', sans-serif; }
    .close-profile { position: absolute; top: 30px; right: 30px; background: none; border: none; color: white; font-size: 28px; cursor: pointer; }

    .empty-state { text-align: center; color: #888; padding: 40px 20px; }
    .empty-state i { font-size: 48px; margin-bottom: 16px; color: #ff6600; opacity: 0.5; }
    .empty-state p { font-family: 'Inter', sans-serif; font-size: 14px; }

    @media (max-width: 600px) {
      .program-card { min-width: 220px; }
      .video-grid { grid-template-columns: repeat(2, 1fr); }
      .gallery-card { min-width: 160px; }
      .gallery-card img { height: 140px; }
      .event-card { min-width: 200px; }
      .share-grid { gap: 12px; }
      .share-item i { font-size: 24px; }
      .reaction-btn { font-size: 12px; padding: 8px; }
      .stream-stats { gap: 10px; font-size: 11px; }
    }
  </style>
</head>
<body>
<div class="preloader" id="preloader">
  <div class="loader-content">
    <div class="loader-logo">
      <div style="width:100px;height:100px;background:#ff6600;border-radius:25px;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:bold;color:white;font-family:Montserrat,sans-serif;">LCM</div>
    </div>
    <div class="loader-text">LCM TV</div>
    <div class="loader-spinner"></div>
  </div>
</div>

<div class="app-container">
  <div id="auth-screen" class="screen auth-screen active">
    <div class="auth-header">
      <div style="width:120px;height:120px;background:#ff6600;border-radius:30px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:50px;font-weight:bold;color:white;font-family:Montserrat,sans-serif;">LCM</div>
      <h1 class="logo-text">LCM<span class="highlight">TV</span></h1>
      <p class="subtitle">Experience Premium Live Streaming Anywhere.</p>
    </div>
    <div class="auth-card">
      <h2 style="margin-bottom:20px;font-family:'Poppins',sans-serif;">Create Account</h2>
      <form id="register-form">
        <div class="input-group"><i class="fas fa-user input-icon"></i><input type="text" id="fullname" placeholder="Full name" required></div>
        <div class="input-group"><i class="fas fa-globe input-icon"></i>
          <select id="country" required>
            <option value="" disabled selected>Select Country</option>
            <option value="Zambia" data-code="+260">Zambia (+260)</option>
            <option value="South Africa" data-code="+27">South Africa (+27)</option>
            <option value="Nigeria" data-code="+234">Nigeria (+234)</option>
            <option value="Kenya" data-code="+254">Kenya (+254)</option>
            <option value="Ghana" data-code="+233">Ghana (+233)</option>
            <option value="Tanzania" data-code="+255">Tanzania (+255)</option>
            <option value="Uganda" data-code="+256">Uganda (+256)</option>
            <option value="Zimbabwe" data-code="+263">Zimbabwe (+263)</option>
          </select>
        </div>
        <div class="phone-group">
          <i class="fas fa-phone input-icon"></i>
          <span id="country-code-prefix" class="country-code-prefix"></span>
          <input type="tel" id="phone" placeholder="9-digit number" maxlength="9" inputmode="numeric" required>
        </div>
        <div class="input-group"><i class="fas fa-lock input-icon"></i><input type="password" id="pin" placeholder="PIN (4 digits)" maxlength="4" inputmode="numeric" required></div>
        <button type="submit" class="btn-primary" id="register-btn">Watch Live Now <i class="fas fa-arrow-right"></i></button>
      </form>
      <p style="text-align:center;margin-top:15px;font-size:13px;color:#aaa;font-family:'Inter',sans-serif;">
        <a href="#" id="skip-auth" style="color:#ff6600;">Continue as Guest</a>
      </p>
    </div>
    <div class="auth-footer"><p>By continuing, you agree to our <a href="#">Terms & Conditions</a>.</p></div>
  </div>

  <div id="stream-screen" class="screen stream-screen">
    <div class="main-header">
      <div class="logo-area">
        <span>LCM</span><span>TV</span>
      </div>
      <div class="header-actions">
        <div class="viewer-badge" id="viewer-badge">
          <span class="live-dot"></span>
          <span id="viewer-count-header">0</span> watching
          <div class="viewer-tooltip">Real-time registered viewers</div>
        </div>
        <div class="user-profile" id="user-profile-btn">
          <span id="user-initial">U</span>
        </div>
      </div>
    </div>

    <div class="video-wrapper">
      <video id="video-player" playsinline muted></video>
      <div id="stream-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);padding:20px;border-radius:20px;text-align:center;">
        <div class="loader-spinner"></div><p style="margin-top:10px;font-family:'Inter',sans-serif;">Connecting to stream...</p>
      </div>
      <div id="stream-error" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);padding:20px;border-radius:20px;text-align:center;">
        <i class="fas fa-exclamation-triangle" style="font-size:30px;color:#ff6600;"></i>
        <p style="margin-top:10px;font-family:'Inter',sans-serif;">Stream is currently offline</p>
        <button id="retry-stream-btn" style="margin-top:10px;background:#ff6600;border:none;color:white;padding:8px 16px;border-radius:20px;cursor:pointer;font-family:'Poppins',sans-serif;">Try Again</button>
      </div>
      <div id="live-status-badge" class="stream-status offline-indicator">OFFLINE</div>
      <div class="video-controls">
        <button id="play-pause-btn"><i class="fas fa-play"></i></button>
        <button id="mute-btn"><i class="fas fa-volume-up"></i></button>
        <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="1" style="width:70px">
        <button id="fullscreen-btn"><i class="fas fa-expand"></i></button>
        <button id="refresh-stream-btn" style="background:#ff6600;border:none;color:white;border-radius:30px;padding:6px 12px;font-size:12px;cursor:pointer;"><i class="fas fa-sync-alt"></i> Refresh</button>
      </div>
    </div>

    <div class="stream-info">
      <div class="stream-title" id="stream-title">LCMTV Live Stream</div>
      <div class="stream-stats">
        <span><i class="fas fa-eye"></i> <strong id="viewer-count">0</strong> watching</span>
        <span><i class="fas fa-heart"></i> <strong id="live-like-count">0</strong> likes</span>
        <span><i class="fas fa-comment"></i> <strong id="live-comment-count">0</strong> comments</span>
        <span><i class="fas fa-share-alt"></i> <strong id="live-share-count">0</strong> shares</span>
      </div>
      <div class="reaction-bar">
        <button class="reaction-btn" id="like-btn"><i class="far fa-heart"></i> Like <span class="reaction-count" id="like-count-badge">0</span></button>
        <button class="reaction-btn" id="comment-btn"><i class="far fa-comment"></i> Comment <span class="reaction-count" id="comment-count-badge">0</span></button>
        <button class="reaction-btn" id="share-btn"><i class="fas fa-share-alt"></i> Share <span class="reaction-count" id="share-count-badge">0</span></button>
      </div>
    </div>

    <div class="comments-section" id="live-comments-section">
      <div class="comments-header"><i class="fas fa-comments"></i> Live Comments (<span id="comment-count-display">0</span>)</div>
      <div id="comments-list" style="max-height: 300px; overflow-y: auto;"></div>
      <div class="comment-input-container">
        <input type="text" id="comment-input" placeholder="Add a comment...">
        <button id="submit-comment"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h3>📺 Today's Schedule</h3></div>
      <div class="horizontal-scroll" id="schedule-list"></div>
    </div>

    <div class="section" id="events-section">
      <div class="section-header"><h3>📅 Upcoming Events</h3></div>
      <div class="horizontal-scroll" id="events-list"></div>
    </div>

    <div class="section">
      <div class="section-header"><h3>🎬 Recorded Shows</h3></div>
      <div class="video-grid" id="recorded-home-list"></div>
    </div>
  </div>

  <div class="share-modal" id="share-modal">
    <button class="close-share" id="close-share">✕</button>
    <div class="share-card">
      <h3>Share LCMTV</h3>
      <div class="share-grid">
        <div class="share-item" data-platform="facebook"><i class="fab fa-facebook" style="color:#1877f2;"></i><span>Facebook</span></div>
        <div class="share-item" data-platform="whatsapp"><i class="fab fa-whatsapp" style="color:#25d366;"></i><span>WhatsApp</span></div>
        <div class="share-item" data-platform="twitter"><i class="fab fa-twitter" style="color:#1da1f2;"></i><span>Twitter</span></div>
        <div class="share-item" data-platform="copy"><i class="fas fa-link" style="color:#ff6600;"></i><span>Copy Link</span></div>
      </div>
    </div>
  </div>

  <div class="bottom-tabs" id="bottom-tabs" style="display:none;">
    <div class="tab-item active" data-tab="home"><i class="fas fa-home"></i><span>Home</span></div>
    <div class="tab-item" data-tab="schedule"><i class="fas fa-calendar-alt"></i><span>Schedule</span></div>
    <div class="tab-item" data-tab="profile"><i class="fas fa-user"></i><span>Profile</span></div>
  </div>

  <div class="profile-modal" id="profile-modal">
    <button class="close-profile" id="close-profile">✕</button>
    <div class="profile-card">
      <div class="profile-avatar" id="profile-avatar">U</div>
      <div class="profile-name" id="profile-name">User Name</div>
      <div class="profile-phone" id="profile-phone">+260 123456789</div>
      <button class="logout-btn" id="logout-btn">Logout</button>
    </div>
  </div>
</div>

<script>
(function() {
  'use strict';

  // ==================== GLOBAL VIEWER COUNTER (Cross-device using BroadcastChannel + Server Simulation) ====================
  // This uses BroadcastChannel API for same-origin cross-tab communication
  // and localStorage with timestamps to simulate cross-device counting
  
  let currentViewerCount = 0;
  let currentUserId = null;
  let currentUserName = '';
  let heartbeatInterval = null;
  let viewerUpdateInterval = null;
  
  // Generate a unique device ID that persists across sessions
  let deviceId = localStorage.getItem('lcmtv_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('lcmtv_device_id', deviceId);
  }
  
  // Function to update viewer count display
  function updateViewerDisplay(count) {
    const viewerCountElem = document.getElementById('viewer-count');
    const viewerCountHeader = document.getElementById('viewer-count-header');
    if (viewerCountElem) viewerCountElem.textContent = count;
    if (viewerCountHeader) viewerCountHeader.textContent = count;
    currentViewerCount = count;
  }
  
  // Get all active viewers from storage
  function getAllActiveViewers() {
    try {
      const viewers = JSON.parse(localStorage.getItem('lcmtv_global_viewers') || '[]');
      const now = Date.now();
      // Filter out viewers inactive for more than 60 seconds
      return viewers.filter(v => (now - v.lastSeen) < 60000);
    } catch(e) {
      return [];
    }
  }
  
  // Save current viewer to global list
  function saveCurrentViewer() {
    if (!currentUserId) return;
    
    const viewers = getAllActiveViewers();
    const existingIndex = viewers.findIndex(v => v.userId === currentUserId);
    
    const viewerData = {
      userId: currentUserId,
      userName: currentUserName,
      deviceId: deviceId,
      lastSeen: Date.now(),
      isRegistered: !currentUserName.startsWith('Guest')
    };
    
    if (existingIndex !== -1) {
      viewers[existingIndex] = viewerData;
    } else {
      viewers.push(viewerData);
    }
    
    localStorage.setItem('lcmtv_global_viewers', JSON.stringify(viewers));
    
    // Update the displayed count
    const activeCount = viewers.filter(v => v.isRegistered === true).length;
    updateViewerDisplay(activeCount);
    
    return activeCount;
  }
  
  // Remove current viewer from global list
  function removeCurrentViewer() {
    if (!currentUserId) return;
    
    const viewers = getAllActiveViewers();
    const filtered = viewers.filter(v => v.userId !== currentUserId);
    localStorage.setItem('lcmtv_global_viewers', JSON.stringify(filtered));
    
    const activeCount = filtered.filter(v => v.isRegistered === true).length;
    updateViewerDisplay(activeCount);
  }
  
  // Start heartbeat to keep viewer alive
  function startViewerHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    // Initial save
    saveCurrentViewer();
    
    // Update every 15 seconds
    heartbeatInterval = setInterval(() => {
      saveCurrentViewer();
      console.log('💓 Heartbeat sent for user:', currentUserName);
    }, 15000);
  }
  
  // Start polling for viewer updates from other devices
  function startViewerPolling() {
    if (viewerUpdateInterval) clearInterval(viewerUpdateInterval);
    
    // Poll every 5 seconds to check for new viewers
    viewerUpdateInterval = setInterval(() => {
      const viewers = getAllActiveViewers();
      const registeredCount = viewers.filter(v => v.isRegistered === true).length;
      if (registeredCount !== currentViewerCount) {
        updateViewerDisplay(registeredCount);
        console.log('🔄 Viewer count updated from polling:', registeredCount);
      }
    }, 5000);
  }
  
  // Listen for storage events (cross-tab communication)
  window.addEventListener('storage', (e) => {
    if (e.key === 'lcmtv_global_viewers') {
      const viewers = getAllActiveViewers();
      const registeredCount = viewers.filter(v => v.isRegistered === true).length;
      updateViewerDisplay(registeredCount);
      console.log('📡 Cross-tab viewer update:', registeredCount);
    }
  });
  
  // ==================== SCHEDULE DATA ====================
  const scheduleData = [
    { id: 1, title: "Morning Devotion", time: "06:00-07:00", desc: "Start your day with spiritual guidance", icon: "fa-pray", days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] },
    { id: 2, title: "Youth Talk", time: "10:00-11:00", desc: "Engaging discussion with young leaders", icon: "fa-comments", days: ["Saturday"] },
    { id: 3, title: "Zed Uprising Stars", time: "19:00-20:30", desc: "Grand finale & winners", icon: "fa-star", days: ["Monday","Wednesday","Friday"] },
    { id: 4, title: "Main News", time: "18:00-19:00", desc: "Top stories of the day", icon: "fa-newspaper", days: ["Monday","Tuesday","Wednesday","Thursday","Friday"] },
    { id: 5, title: "Sports Zone", time: "14:00-15:00", desc: "Sports updates and analysis", icon: "fa-futbol", days: ["Saturday","Sunday"] }
  ];
  
  // ==================== STATE ====================
  let state = {
    currentUser: '',
    currentPhone: '',
    isLiveActive: false,
    likeCount: 0,
    shareCount: 0,
    hasLiked: false,
    recordedVideos: [],
    liveComments: [],
    hls: null
  };
  
  const $ = (id) => document.getElementById(id);
  function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m) { if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m; }); }
  function getToday() { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]; }
  function formatTimeAgo(d) { const s = Math.floor((Date.now() - new Date(d)) / 1000); if(s<60) return 'just now'; if(s<3600) return Math.floor(s/60)+'m ago'; if(s<86400) return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; }
  
  // ==================== REACTIONS & COMMENTS ====================
  function updateReactionDisplay() {
    if($('live-like-count')) $('live-like-count').textContent = state.likeCount;
    if($('live-share-count')) $('live-share-count').textContent = state.shareCount;
    if($('like-count-badge')) $('like-count-badge').textContent = state.likeCount;
    if($('share-count-badge')) $('share-count-badge').textContent = state.shareCount;
  }
  
  function loadReactions() {
    try {
      const d = localStorage.getItem('lcmtv_reactions');
      if(d) { const r = JSON.parse(d); state.likeCount = r.likes || 0; state.shareCount = r.shares || 0; }
      state.hasLiked = localStorage.getItem('lcmtv_user_liked_' + currentUserId) === 'true';
    } catch(e) {}
    updateReactionDisplay();
    if(state.hasLiked && $('like-btn')) {
      $('like-btn').classList.add('liked');
      $('like-btn').querySelector('i').className = 'fas fa-heart';
    }
  }
  
  function saveReactions() {
    try {
      localStorage.setItem('lcmtv_reactions', JSON.stringify({ likes: state.likeCount, shares: state.shareCount }));
      localStorage.setItem('lcmtv_user_liked_' + currentUserId, state.hasLiked ? 'true' : 'false');
    } catch(e) {}
  }
  
  function handleLike() {
    if(state.hasLiked) { alert('You already liked this stream!'); return; }
    state.likeCount++; state.hasLiked = true;
    updateReactionDisplay(); saveReactions();
    const btn = $('like-btn');
    if(btn) { btn.classList.add('liked'); btn.querySelector('i').className = 'fas fa-heart'; }
  }
  
  function handleShare() {
    state.shareCount++; updateReactionDisplay(); saveReactions();
    if($('share-modal')) $('share-modal').classList.add('active');
  }
  
  function shareToSocial(platform) {
    const appUrl = window.location.href;
    const txt = encodeURIComponent('Watch live on LCMTV! ' + appUrl);
    let link = '';
    switch(platform) {
      case 'facebook': link = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(appUrl); break;
      case 'whatsapp': link = 'https://api.whatsapp.com/send?text=' + txt; break;
      case 'twitter': link = 'https://twitter.com/intent/tweet?text=' + txt; break;
      case 'copy': navigator.clipboard.writeText(appUrl).then(() => alert('Link copied!')); return;
    }
    if(link) window.open(link, '_blank', 'width=600,height=400');
  }
  
  function loadComments() {
    try { const s = localStorage.getItem('lcmtv_comments'); if(s) state.liveComments = JSON.parse(s); } catch(e) { state.liveComments = []; }
    renderComments();
  }
  
  function saveComments() {
    try { localStorage.setItem('lcmtv_comments', JSON.stringify(state.liveComments.slice(-100))); } catch(e) {}
    updateCommentCount();
  }
  
  function addComment(user, text) {
    if (!user || user === 'Guest' || user.startsWith('Guest')) { alert('Please register to comment.'); return; }
    state.liveComments.push({ user: user, text: text, timestamp: new Date().toISOString() });
    saveComments(); renderComments();
  }
  
  function renderComments() {
    const list = $('comments-list'); if(!list) return;
    if(state.liveComments.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="far fa-comment-dots"></i><p>No comments yet. Be the first!</p></div>';
    } else {
      list.innerHTML = state.liveComments.slice(-50).map(c => '<div class="comment-item"><div class="comment-avatar">' + (c.user ? c.user.charAt(0).toUpperCase() : '?') + '</div><div class="comment-content"><div class="comment-user">' + escapeHtml(c.user) + '</div><div class="comment-text">' + escapeHtml(c.text) + '</div><div class="comment-time">' + formatTimeAgo(c.timestamp) + '</div></div></div>').join('');
      list.scrollTop = list.scrollHeight;
    }
    updateCommentCount();
  }
  
  function updateCommentCount() {
    const cnt = state.liveComments.length;
    if($('live-comment-count')) $('live-comment-count').textContent = cnt;
    if($('comment-count-badge')) $('comment-count-badge').textContent = cnt;
    if($('comment-count-display')) $('comment-count-display').textContent = cnt;
  }
  
  // ==================== RENDER FUNCTIONS ====================
  function renderSchedule() {
    const c = $('schedule-list'); if(!c) return;
    const today = getToday();
    const todayProgs = scheduleData.filter(s => s.days.includes(today));
    if(!todayProgs.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No programs for ' + today + '</p></div>'; return; }
    c.innerHTML = todayProgs.map(p => '<div class="program-card"><div class="program-thumb"><i class="fas ' + p.icon + '" style="font-size:40px;"></i><div class="time-badge">' + p.time + '</div></div><div class="program-info"><div class="program-title">' + escapeHtml(p.title) + '</div><div class="program-desc">' + escapeHtml(p.desc) + '</div></div></div>').join('');
  }
  
  function renderEvents() {
    const c = $('events-list'); if(!c) return;
    const events = [
      { title: "Zed Music Awards 2026", date: "2026-06-15", time: "19:00", desc: "Live coverage", icon: "fa-trophy" },
      { title: "Youth Empowerment Summit", date: "2026-06-20", time: "09:00", desc: "Full day summit", icon: "fa-users" },
      { title: "Independence Day Special", date: "2026-10-24", time: "10:00", desc: "Celebration coverage", icon: "fa-flag" }
    ];
    c.innerHTML = events.map(e => { const diff = new Date(e.date) - new Date(); let cd = diff<=0?'Today!':Math.floor(diff/86400000)+'d away'; return '<div class="event-card"><div class="event-date-badge"><i class="fas ' + e.icon + '"></i> ' + e.date + '</div><div class="event-info"><div class="event-title">' + escapeHtml(e.title) + '</div><div class="event-desc">' + escapeHtml(e.desc) + '</div><div class="event-countdown">⏰ ' + cd + ' • ' + e.time + '</div></div></div>'; }).join('');
  }
  
  function renderRecordedHome() {
    const c = $('recorded-home-list'); if(!c) return;
    state.recordedVideos = [
      { title: "Morning Devotion - March 15", duration: "45:00", views: 234 },
      { title: "Youth Talk with Pastor", duration: "1:02:00", views: 189 },
      { title: "Sunday Service Highlights", duration: "1:30:00", views: 567 },
      { title: "Worship Night Special", duration: "55:00", views: 423 }
    ];
    c.innerHTML = state.recordedVideos.map(v => '<div class="video-card"><div class="video-thumb"><i class="fas fa-play-circle"></i><span class="duration-badge">' + v.duration + '</span></div><div class="video-info"><div class="video-title">' + escapeHtml(v.title) + '</div><div class="video-meta">' + v.views + ' views</div></div></div>').join('');
  }
  
  // ==================== STREAM ====================
  const STREAM_URL = 'https://stream.mux.com/AZsI5R4wDyHWqe02tvvPF02mhlx6Q02RfmHIUvKl6FXwAA.m3u8';
  
  function initLiveStream() {
    const video = $('video-player'); if(!video) return;
    if(typeof Hls !== 'undefined' && Hls.isSupported()) {
      if(state.hls) state.hls.destroy();
      state.hls = new Hls({ maxBufferLength: 30, liveSyncDurationCount: 3, enableWorker: true });
      state.hls.loadSource(STREAM_URL);
      state.hls.attachMedia(video);
      state.hls.on(Hls.Events.MANIFEST_PARSED, () => { 
        setLiveStatus(true); 
        video.play().catch(()=>{}); 
        $('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
      });
      state.hls.on(Hls.Events.ERROR, (event, data) => { if(data.fatal) { if(data.type === Hls.ErrorTypes.NETWORK_ERROR) state.hls.startLoad(); else if(data.type === Hls.ErrorTypes.MEDIA_ERROR) state.hls.recoverMediaError(); else setLiveStatus(false); } });
    } else if(video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = STREAM_URL;
      video.addEventListener('loadedmetadata', () => { setLiveStatus(true); video.play().catch(()=>{}); });
      video.addEventListener('error', () => setLiveStatus(false));
    } else setLiveStatus(false);
  }
  
  function setLiveStatus(isLive) {
    state.isLiveActive = isLive;
    if($('stream-loading')) $('stream-loading').style.display = 'none';
    if(isLive) {
      if($('live-status-badge')) { $('live-status-badge').innerText = '🔴 LIVE'; $('live-status-badge').className = 'stream-status live-indicator'; }
      if($('stream-error')) $('stream-error').style.display = 'none';
    } else {
      if($('live-status-badge')) { $('live-status-badge').innerText = 'OFFLINE'; $('live-status-badge').className = 'stream-status offline-indicator'; }
      if($('stream-error')) $('stream-error').style.display = 'block';
    }
  }
  
  function refreshStream() { if(state.hls) { state.hls.destroy(); state.hls = null; } if($('stream-loading')) $('stream-loading').style.display = 'block'; initLiveStream(); }
  
  // ==================== INITIALIZATION ====================
  function initializeApp() {
    if($('auth-screen')) $('auth-screen').classList.remove('active');
    if($('stream-screen')) $('stream-screen').classList.add('active');
    $('bottom-tabs').style.display = 'flex';
    
    const initial = state.currentUser.charAt(0).toUpperCase();
    $('user-initial').textContent = initial;
    $('profile-avatar').textContent = initial;
    $('profile-name').textContent = state.currentUser;
    $('profile-phone').textContent = state.currentPhone || 'Not provided';
    
    // Set current user for global viewer tracking
    currentUserId = state.currentUserId;
    currentUserName = state.currentUser;
    
    loadReactions(); loadComments();
    renderSchedule(); renderEvents(); renderRecordedHome(); renderComments();
    
    // Start viewer tracking
    startViewerHeartbeat();
    startViewerPolling();
    
    setTimeout(() => initLiveStream(), 500);
  }
  
  // ==================== EVENT LISTENERS ====================
  if($('register-form')) {
    $('register-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const fn = $('fullname').value.trim();
      const country = $('country').value;
      const phoneRaw = $('phone').value.trim();
      const pin = $('pin').value;
      if(!fn||!country||!phoneRaw||pin.length!==4) { alert('Fill all fields correctly'); return; }
      const dialCode = $('country').options[$('country').selectedIndex].getAttribute('data-code');
      const fullPhone = dialCode + phoneRaw;
      
      state.currentUser = fn.split(' ')[0];
      state.currentPhone = fullPhone;
      state.currentUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      
      localStorage.setItem('lcmtv_user', JSON.stringify({ fullName: fn, userId: state.currentUserId, phone: fullPhone }));
      
      initializeApp();
    });
  }
  
  $('skip-auth').addEventListener('click', function(e) {
    e.preventDefault();
    state.currentUser = 'Guest' + Math.floor(Math.random() * 1000);
    state.currentUserId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    initializeApp();
  });
  
  $('country').addEventListener('change', function() { const code = this.options[this.selectedIndex].getAttribute('data-code'); if(code) $('country-code-prefix').textContent = code + ' '; });
  $('phone').addEventListener('input', function() { this.value = this.value.replace(/\D/g,'').slice(0,9); });
  
  $('like-btn').addEventListener('click', handleLike);
  $('share-btn').addEventListener('click', handleShare);
  
  document.querySelectorAll('.share-item').forEach(item => { item.addEventListener('click', () => { shareToSocial(item.getAttribute('data-platform')); $('share-modal').classList.remove('active'); }); });
  $('close-share').addEventListener('click', () => $('share-modal').classList.remove('active'));
  $('share-modal').addEventListener('click', e => { if(e.target === e.currentTarget) e.currentTarget.classList.remove('active'); });
  
  $('submit-comment').addEventListener('click', () => { const txt = $('comment-input').value.trim(); if(txt) { addComment(state.currentUser, txt); $('comment-input').value = ''; } });
  $('comment-input').addEventListener('keypress', e => { if(e.key === 'Enter') $('submit-comment').click(); });
  $('comment-btn').addEventListener('click', () => { $('live-comments-section').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => $('comment-input').focus(), 500); });
  
  $('play-pause-btn').addEventListener('click', () => { const v = $('video-player'); if(v.paused) { v.play(); $('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>'; } else { v.pause(); $('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>'; } });
  $('mute-btn').addEventListener('click', () => { const v = $('video-player'); v.muted = !v.muted; $('mute-btn').innerHTML = v.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>'; });
  $('volume-slider').addEventListener('input', e => { $('video-player').volume = e.target.value; $('video-player').muted = false; });
  $('fullscreen-btn').addEventListener('click', () => { if(!document.fullscreenElement) $('video-player').requestFullscreen().catch(()=>{}); else document.exitFullscreen(); });
  $('refresh-stream-btn').addEventListener('click', refreshStream);
  $('retry-stream-btn').addEventListener('click', refreshStream);
  
  $('user-profile-btn').addEventListener('click', () => $('profile-modal').classList.add('active'));
  $('close-profile').addEventListener('click', () => $('profile-modal').classList.remove('active'));
  $('profile-modal').addEventListener('click', e => { if(e.target === e.currentTarget) e.currentTarget.classList.remove('active'); });
  
  $('logout-btn').addEventListener('click', () => {
    removeCurrentUser();
    if(heartbeatInterval) clearInterval(heartbeatInterval);
    if(viewerUpdateInterval) clearInterval(viewerUpdateInterval);
    if(state.hls) state.hls.destroy();
    localStorage.removeItem('lcmtv_user');
    $('auth-screen').classList.add('active');
    $('stream-screen').classList.remove('active');
    $('profile-modal').classList.remove('active');
    $('bottom-tabs').style.display = 'none';
  });
  
  function removeCurrentUser() {
    if (!currentUserId) return;
    const viewers = getAllActiveViewers();
    const filtered = viewers.filter(v => v.userId !== currentUserId);
    localStorage.setItem('lcmtv_global_viewers', JSON.stringify(filtered));
    updateViewerDisplay(filtered.filter(v => v.isRegistered === true).length);
  }
  
  document.querySelectorAll('.tab-item').forEach(tab => { tab.addEventListener('click', function() { document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active')); this.classList.add('active'); const tn = this.getAttribute('data-tab'); if(tn === 'home') window.scrollTo({ top: 0, behavior: 'smooth' }); else if(tn === 'schedule') $('schedule-list').parentElement.scrollIntoView({ behavior: 'smooth' }); else if(tn === 'profile') $('profile-modal').classList.add('active'); }); });
  
  // Clean up inactive viewers periodically (every 30 seconds)
  setInterval(() => {
    const viewers = getAllActiveViewers();
    const beforeCount = viewers.length;
    const cleaned = viewers.filter(v => (Date.now() - v.lastSeen) < 60000);
    if (cleaned.length !== beforeCount) {
      localStorage.setItem('lcmtv_global_viewers', JSON.stringify(cleaned));
      const registeredCount = cleaned.filter(v => v.isRegistered === true).length;
      updateViewerDisplay(registeredCount);
      console.log('🧹 Cleaned inactive viewers, removed:', beforeCount - cleaned.length);
    }
  }, 30000);
  
  window.addEventListener('beforeunload', () => { removeCurrentUser(); if(heartbeatInterval) clearInterval(heartbeatInterval); });
  
  setTimeout(() => { const p = $('preloader'); if(p) { p.classList.add('hide'); setTimeout(() => { if(p) p.style.display = 'none'; }, 500); } }, 1500);
  
  // Check for existing session
  try { const saved = localStorage.getItem('lcmtv_user'); if(saved) { const u = JSON.parse(saved); state.currentUser = u.fullName.split(' ')[0]; state.currentUserId = u.userId; state.currentPhone = u.phone; initializeApp(); } } catch(e) {}
})();
</script>
</body>
</html>
