<template>
  <div class="account-settings">
    <h2>账号设置</h2>
    <form @submit.prevent="submitSettings">
      <div class="form-group">
        <label for="notifications">通知设置</label>
        <select id="notifications" v-model="settings.notifications">
          <option value="all">接收所有通知</option>
          <option value="important">仅接收重要通知</option>
          <option value="none">不接收通知</option>
        </select>
      </div>
      <div class="form-group">
        <label for="theme">主题</label>
        <select id="theme" v-model="settings.theme">
          <option value="light">浅色模式</option>
          <option value="dark">深色模式</option>
        </select>
      </div>
      <button type="submit" class="btn primary">保存</button>
    </form>
    <div v-if="loading">加载中...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const settings = ref({
  notifications: 'all',
  theme: 'light'
});
const loading = ref(false);
const error = ref(null);

const fetchSettings = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/settings');
    settings.value = response.data;
  } catch (err) {
    error.value = '加载设置失败';
  } finally {
    loading.value = false;
  }
};

const submitSettings = async () => {
  loading.value = true;
  error.value = null;
  try {
    await axios.put('/api/settings', settings.value);
    alert('设置已保存！');
  } catch (err) {
    error.value = '保存失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchSettings);
</script>

<style scoped>
.account-settings {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.form-group {
  margin-bottom: 15px;
}
label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 10px 15px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #0056b3;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>
