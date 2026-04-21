<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  console.info('[MindLink Client] onLaunch');
});

onShow(() => {
  console.info('[MindLink Client] onShow');
});
</script>

<style>
/* uni-app 全局样式 · 与 Web 端共享 design tokens */
page {
  background: #F8FAFC;
  color: #334155;
  font-size: 28rpx;
  line-height: 1.6;
}
</style>
