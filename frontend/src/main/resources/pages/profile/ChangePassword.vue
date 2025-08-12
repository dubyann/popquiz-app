<template>
  <div class="change-password">
    <h2>修改密码</h2>
    <form @submit.prevent="submitPassword">
      <div class="form-group">
        <label for="current-password">当前密码</label>
        <input id="current-password" v-model="passwords.current" type="password" required />
      </div>
      <div class="form-group">
        <label for="new-password">新密码</label>
        <input id="new-password" v-model="passwords.new" type="password" required />
      </div>
      <div class="form-group">
        <label for="confirm-password">确认新密码</label>
        <input id="confirm-password" v-model="passwords.confirm" type="password" required />
      </div>
      <button type="submit" class="btn primary" :disabled="loading">
        <span v-if="loading">保存中...</span>
        <span v-else>保存</span>
      </button>
      <div v-if="error" class="error-message">{{ error }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const passwords = ref({
  current: '',
  new: '',
  confirm: ''
});
const loading = ref(false);
const error = ref(null);

const submitPassword = async () => {
  if (passwords.value.new !== passwords.value.confirm) {
    error.value = '新密码和确认密码不一致！';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    await axios.put('/api/password', {
      currentPassword: passwords.value.current,
      newPassword: passwords.value.new
    });
    alert('密码已修改！');
  } catch (err) {
    error.value = '修改密码失败，请检查当前密码是否正确';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.change-password {
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
.error-message {
  margin-top: 10px;
  color: red;
}
</style>
