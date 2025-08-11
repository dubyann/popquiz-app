import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // �������� /api ���󵽺��
      '/api': {
        target: 'http://localhost:3001', // ��ĺ�˷����ַ
        changeOrigin: true,
        // ������û�� /api ǰ׺����Ҫ��д·��
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
