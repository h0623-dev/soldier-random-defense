package com.steey.soldierdefense;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // 화면 아래의 시스템 내비게이션 바(뒤로 · 홈 · 최근 앱)를 숨긴다. 화면 아래 가장자리를 쓸어 올리면 잠깐 나타났다가 다시 숨는다.
    // 위쪽 상태 표시줄(시계 · 배터리)은 그대로 둔다.
    private void hideNavBar() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.navigationBars());
    }

    @Override
    public void onResume() {
        super.onResume();
        hideNavBar();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideNavBar();
    }
}
