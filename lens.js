var http = require("http");
var cheerio = require("cheerio");
var fs = require("fs");
var async = require("async");
var iconv = require("iconv-lite");

var num = 1;
var pageSize = 30;
var baseUrl = "http://detail.zol.com.cn";
var cbs = [];
var urlList = [];
var dataObj = {};
var length = 0;

var attrMap = {
  "镜头定位" : "purpose",
  "镜头分类" : "category",
  "镜头用途" : "usage",
  "镜头类型" : "type",
  "镜头卡口" : "swan",
  "滤镜尺寸" : "size",
  "驱动马达" : "motor",
  "最大光圈" : "maxAperture",
  "最小光圈" : "minAperture",
  "光圈叶片数" : "blades",
  "焦距范围" : "range",
  "等效焦距" : "equivalentLength",
  "最近对焦距离" : "distance",
  "最大放大倍率" : "maxRatio",
  "防抖性能" : "stabilization",
  "镜头直径" : "diameter",
  "镜头长度" : "length",
  "镜头重量" : "weight"
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
        name = $intro.find("h3 a").text();

        url && urlList.push(function(cb){
          request(baseUrl+url,"detail",cb)
        });
  });
}

function parseData( data ){
  if( data ){
    var $ = cheerio.load(data),
        $params = $(".category_param_list li"),
        priceText = $(".price-type").text(),
        isHalt = $(".price .n_c").text().trim() === "停产",
        price,
        relateId,
        obj={};
    relateId = $(".compare-btn").data("rel").split(",")[0];
    obj.name = $(".product-title a").text().trim();
    price = (priceText.match(/[\d.]+/) || [])[0];
    price && ( obj.price = ~priceText.indexOf("万") ? price*10000 : +price)
    obj.isHalt = isHalt;
    obj.imageUrl = $(".pic img").attr("src");
    $params.each(function(i,v){
      var $this = $(v),
          title = $this.find("span").eq(0).text().trim(),
          contentDom = $this.find("span").eq(1),
          content = contentDom.find("a").length ? contentDom.find("a").text().trim() : contentDom.text().trim();
      if( title in attrMap ){
        obj[attrMap[title]] = valueHandler(content,attrMap[title]);
      }
    });
    dataObj[relateId] = obj;
    console.log("## total: " + ++length)
  }
}

function valueHandler( value, type ){
  return value;
}

function count(){
  return num++;
}

// request list
for(var i = 1; i<= pageSize;i++){
  cbs.push(function(cb){
    request(baseUrl+"/lens/"+count()+".html","list",cb)
  })
}

async.parallel( cbs, function(err,results){
  console.log("about total lens:" + urlList.length)
// urlList.splice(1);
  async.parallel( urlList, function(err,results){
    console.log("fetch finished...")

    fs.writeFile('data/lens.json', JSON.stringify(dataObj), function (err) {
      if (err) throw err;
      console.log("save data finished!")
    });
  });
});
