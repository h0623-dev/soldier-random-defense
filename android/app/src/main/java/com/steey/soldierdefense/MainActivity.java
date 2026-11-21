package com.steey.soldierdefense;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private final Handler handler = new Handler(Looper.getMainLooper());

    // 화면 아래의 시스템 내비게이션 바(뒤로 · 홈 · 최근 앱)를 숨긴다. 화면 아래 가장자리를 쓸어 올리면 잠깐 나타났다가 다시 숨는다.
    // 위쪽 상태 표시줄(시계 · 배터리)은 그대로 둔다.
    // 주의: Capacitor의 SystemBars 플러그인이 켜질 때 시스템 바를 '보이기'로 맞춘다(설정 hidden=false). 그것보다 늦게 숨겨야 해서
    //       켜진 뒤 조금 있다가 몇 번 더 숨긴다. 화면(www/js/main.js hideNavBar)에서도 같은 일을 한다.
    private void hideNavBar() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.navigationBars());
    }

    private void hideNavBarSoon() {
        hideNavBar();
        for (int ms : new int[] { 300, 1000, 2500 }) handler.postDelayed(this::hideNavBar, ms);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideNavBarSoon();
    }

    @Override
    public void onResume() {
        super.onResume();
        hideNavBarSoon();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideNavBarSoon();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
