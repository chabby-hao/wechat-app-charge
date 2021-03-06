//logs.js
// const util = require('../../utils/util.js')
const serverUrl = require('../../config').serverUrl;
const app = getApp();
Page({
  data: {
    address: '',
    addressNumber: '',
    // items: [
    //   { value: '0', name: '充满', checked: true },
    //   { value: '3', name: '3小时', checked: false },
    //   { value: '2', name: '2小时', checked: false },
    //   { value: '1', name: '1小时', checked: false },
    // ],
    deviceId: null,
    taskId: null,
    reportSubmit: true,//获取formId
    scroll_x: true,
    leftTo: 0,
    left: 0,
    active1: 'active',
    active2: '',
    active3: '',
    active4: '',
    mode: 0,//0=充满
    timer: null,
    loading: false,
    disabled: false,
    timeInterval: null,
  },

  upper: function (e) {
    this.setData({
      leftTo: false
    })
  },
  lower: function (e) {
    this.setData({
      leftTo: false
    })
  },
  scroll: function (e) {
    //console.log(this.data.left);
    //0-92 92-276 277-463 463-549
    //设置leftTo
    var sleft = e.detail.scrollLeft;
    var active = 0;
    if (sleft >= 0 && sleft <= 92) {
      var active = 1;
      var left = 0;
    } else if (sleft > 92 && sleft <= 276) {
      var active = 2;
      var left = 184;
    } else if (sleft > 277 && sleft <= 463) {
      var active = 3;
      var left = 369;
    } else if (sleft > 463 && sleft <= 549) {
      var active = 4;
      var left = 549;
    }
    if (active) {
      this.active(active);
    }
    this.setData({
      leftTo: left,
    })
    // console.log(e.detail.scrollLeft)
  },
  untouch: function () {
    //设置leftTo
    //因为滑动控制不流畅，所以不使用自动修正
    // if (this.data.leftTo !== false) {
    //   clearTimeout(this.timer);
    //   this.timer = setTimeout(function () {
    //     this.setData({
    //       left: this.data.leftTo
    //     })
    //   }.bind(this), 1000);
    // }
  },

  active: function (n) {
    var data = {
      active1: '',
      active2: '',
      active3: '',
      active4: '',
    };
    if (n == 1) {
      data.active1 = 'active';
      data.mode = 0;
    } else if (n == 2) {
      data.active2 = 'active';
      data.mode = 1;
    } else if (n == 3) {
      data.active3 = 'active';
      data.mode = 2;
    } else if (n == 4) {
      data.active4 = 'active';
      data.mode = 4;
    }
    this.setData(data);
  },

  onLoad: function (option) {
    console.log(option);
    var that = this;
    var token = app.globalData.token;
    var deviceId = option.device_id;
    this.setData({
      deviceId: deviceId,
    });
    wx.request({
      url: serverUrl + '/charge/deviceAddress',
      data: { token: token, device_id: deviceId },
      success: function (res) {
        if (res.data.code === 200) {
          that.setData({
            address: res.data.data.address,
            addressNumber: res.data.data.address_number,
          });
        }
      }
    })
  },

  formSubmit: function (e) {
    console.log(e.detail);
    var that = this;
    //mode 为单位为小时，0为充满
    //var mode = e.detail.value.mode;
    var mode = this.data.mode;
    var token = app.globalData.token;
    var deviceId = this.data.deviceId;
    var formId = e.detail.formId;
    var data = { mode: mode, token: token, device_id: deviceId, form_id: formId };
    wx.request({
      url: serverUrl + '/charge/chargeBegin',
      data: data,
      dataType: 'json',
      method: "POST",
      success: function (res) {
        console.log(res);
        if (res.data.code === 200) {
          app.globalData.deviceId = deviceId;
          app.globalData.taskId = res.data.data.task_id;
          wx.showModal({
            title: '提示',
            content: '30秒之后盒盖充电，请您检查插头是否插好',
            showCancel: false,
            confirmText: "知道了",
          })
          that.setData({
            loading: true,
            disabled: true,
          });
          that.refresh();
          //此处不跳转
          // wx.redirectTo({
          //   url: '../charging/charging',
          // })
        }
      }
    })
    console.log('form发生了submit事件，携带数据为：', e.detail)
  },

  refresh: function () {
    var that = this;
    if(!that.data.loading){
      return false;
    }
    var timeInterval = that.data.timeInterval;
    var globalData = app.globalData;
    console.log(globalData);
    var token = globalData.token;
    var refreshMins = function () {
      wx.request({
        url: serverUrl + '/charge/chargingTime',
        data: { token: token },
        success: function (res) {
          if (res.data.code === 200) {
            var state = res.data.data.status;
            console.log('charge state . ' + state);
            if (state === 0 || state === 1) {
              //充电中
              clearInterval(that.data.timeInterval);
              wx.redirectTo({
                url: '../charging/charging',
              })
            } else if (state === 3) {
              //初始化任务，但还未通电
            } else if (state === 4) {
              //初始化任务，未充电，箱子已关闭
              clearInterval(that.data.timeInterval);
              wx.reLaunch({
                url: '../index/index?fail=1',
              })
            } else {
              //已充电完成，直接跳首页
              clearInterval(that.data.timeInterval);
              wx.reLaunch({
                url: '../index/index',
              })
            }

          }
        }
      })
    }
    timeInterval = setInterval(function () {
      refreshMins();
    }, 2000);
    refreshMins();
    that.setData({
      timeInterval: timeInterval,
    })
  },

  onShow: function () {
     clearInterval(this.data.timeInterval);
     this.refresh();
  },

  onHide: function () {
     clearInterval(this.data.timeInterval);
  },

  onUnload: function () {
    clearInterval(this.data.timeInterval);
  }

})