var http = require("http");
var cheerio = require("cheerio");
var fs = require("fs");
var async = require("async");
var iconv = require("iconv-lite");

var num = 1;
var pageSize = 1;
var baseUrl = "http://detail.zol.com.cn";
var cbs = [];
var urlList = [];
var dataArr = [];

var attrMap = {
  "发布日期" : "publishDate",
  "有效像素" : "pixel",
  "产品重量" : "weight",
  "传感器类型" : "sensor",
  "传感器尺寸" : "sensorSize",
  "影像处理器" : "processor",
  "对焦点数" : "focusPoints",
  "最高分辨率" : "maxPixcels",
  "产品类型" : "productType",
  "显示屏尺寸" : "lcd",
  "快门速度" : "shutterSpeed",
  "外形尺寸" : "size",
  "参考价格" : "price",
  "是否停产" : "isHalt"
}

function request( url,type,cb ){
  http.get(url,function(res){
    var data = "";
    res.on('data', function (chunk) {
      data += iconv.decode(chunk,'gbk');
    });
    res.on("end", function() {
      if( type === "list")
        buildUrl(data);
      else if( type === "detail")
        parseData(data);
      cb(null,Math.random());
    });
  });
}

function buildUrl( data ){
  var $ = cheerio.load(data);
  var list = $(".list-item");
  list.each(function(i,v){
    var $this = $(this),
        $intro = $this.find(".pro-intro"),
        url = $intro.find(".param .more").attr("href");
        price = $this.find(".price-type").text(),
        name = $intro.find("h3 a").text();

        if( /\d+/.test(price) && !/套机/.test(name) && url ){
          urlList.push(function(cb){
            request(baseUrl+url,"detail",cb)
          });
        }
  });
}

function parseData( data ){
  if( data ){
    var $ = cheerio.load(data),
        $params = $(".category_param_list li"),
        priceText = $(".price-type").text(),
        price,
        obj={};
    obj.relateId = $("#addCompareBtn").data("rel").split(",")[0];
    obj.name = $(".product-title a").text().replace(/^[\u4e00-\u9fa5]*/,"").trim();
    price = (priceText.match(/[\d.]+/) || [])[0];
    price && ( obj.price = ~priceText.indexOf("万") ? price*10000 : +price)
    $params.each(function(i,v){
      var $this = $(v),
          title = $this.find("span").eq(0).text().trim(),
          contentDom = $this.find("span").eq(1),
          content = contentDom.find("a").length ? contentDom.find("a").text().trim() : contentDom.text().trim();
      if( title in attrMap ){
        obj[attrMap[title]] = valueHandler(content,attrMap[title]);
      }
    });
    dataArr.push(obj)
    console.log("## total: " + dataArr.length)
  }
}

function valueHandler( value, type ){
  switch( type ){
    case "sensorSize" : 
      value = /全画幅/.test(value) ? "全画幅" : "APS-C";
      break;
    case "weight" : 
    case "pixel" :
    case "lcd" :
    case "focusPoints" :
      value = value.match(/[\d.]+/)[0];
      break;
    case "shutterSpeed" : 
      value = value.match(/[\d-\/]*/)[0];
      break;
    case "publishDate" :
      value = value.replace("年","-").replace("月","");
      break;
    default:
      break;
  }
  return value;
}

function count(){
  return num++;
}

// request list
for(var i = 1; i<= pageSize;i++){
  cbs.push(function(cb){
    request(baseUrl+"/digital_camera_index/subcate15_232_list_s1875_"+count()+".html","list",cb)
  })
}

async.parallel( cbs, function(err,results){
  console.log("about total camera:" + urlList.length)
// urlList.splice(1);
  async.parallel( urlList, function(err,results){
    console.log("fetch finished...")

    fs.writeFile('data/data.json', JSON.stringify(dataArr), function (err) {
      if (err) throw err;
      console.log("save data finished!")
    });
  });
});
