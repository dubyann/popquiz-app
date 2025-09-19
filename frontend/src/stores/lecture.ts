import { defineStore } from "pinia";
import { ref } from "vue";

export const useLectureStore = defineStore('lecture', () => {
    const isEndingLecture = ref(false);
  return {
    isEndingLecture
  }
})