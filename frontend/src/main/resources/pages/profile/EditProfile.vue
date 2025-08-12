<template>
  <div class="edit-profile">
    <h2>修改个人信息</h2>
    <form @submit.prevent="submitProfile">
      <div class="form-group">
        <label for="username">用户名</label>
        <input id="username" v-model="profile.username" type="text" required />
      </div>
      <div class="form-group">
        <label for="email">邮箱</label>
        <input id="email" v-model="profile.email" type="email" required />
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

const profile = ref({
  username: '',
  email: ''
});
const loading = ref(false);
const error = ref(null);

const fetchProfile = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/profile');
    profile.value = response.data;
  } catch (err) {
    error.value = '加载个人信息失败';
  } finally {
    loading.value = false;
  }
};

const submitProfile = async () => {
  loading.value = true;
  error.value = null;
  try {
    await axios.put('/api/profile', profile.value);
    alert('个人信息已保存！');
  } catch (err) {
    error.value = '保存失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchProfile);
</script>

<style scoped>
.edit-profile {
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
input {
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
