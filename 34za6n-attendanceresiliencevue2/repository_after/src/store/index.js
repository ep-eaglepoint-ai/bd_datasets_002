import Vue from 'vue'
import Vuex from 'vuex'
import attendanceModule from './modules/attendance'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    attendance: attendanceModule
  },
  strict: process.env.NODE_ENV !== 'production'
})