const test = require("node:test");
const assert = require("node:assert/strict");
const {outdoorComfort, clothingAdvice} = require("../weather-advice.js");

const sunnyMelbourne = {
  temperature_2m: 11.3,
  apparent_temperature: 6.7,
  weather_code: 0,
  is_day: 1,
  precipitation: 0,
  cloud_cover: 10,
  shortwave_radiation: 390,
  wind_speed_10m: 18.4,
  wind_gusts_10m: 45
};

test("晴朗冬日下午不会因模型体感偏低而建议厚棉衣", () => {
  const result = clothingAdvice({
    current: sunnyMelbourne,
    profile: {size:"small", coat:"long", age:"puppy"},
    dogName: "小狗"
  });
  assert.equal(Math.round(result.comfort.value), 13);
  assert.match(result.title, /不用穿厚棉衣/);
  assert.doesNotMatch(result.title, /速去速回|厚保暖衣/);
  assert.match(result.why, /晴晒/);
});

test("同样气温在无日照时会给怕冷小狗更保守的薄层建议", () => {
  const result = clothingAdvice({
    current: {...sunnyMelbourne, is_day:0, weather_code:3, cloud_cover:100, shortwave_radiation:0},
    profile: {size:"small", coat:"short", age:"senior"},
    dogName: "小狗"
  });
  assert.ok(result.comfort.value < 12);
  assert.match(result.title, /薄衣服|保暖外套/);
});

test("接近冰点时才进入厚保暖衣和缩短散步建议", () => {
  const result = clothingAdvice({
    current: {temperature_2m:-1, apparent_temperature:-5, weather_code:3, is_day:0},
    dogName: "小狗"
  });
  assert.match(result.title, /厚保暖衣/);
  assert.match(result.why, /缩短散步时间/);
});

test("降雨时优先给雨衣建议并根据冷暖决定内层", () => {
  const result = clothingAdvice({
    current: {...sunnyMelbourne, weather_code:61, precipitation:0.5, shortwave_radiation:40},
    rainy: true,
    dogName: "小狗"
  });
  assert.match(result.title, /雨衣/);
  assert.doesNotMatch(result.title, /厚棉衣/);
});

test("高温时明确不穿衣并提示补水与路面温度", () => {
  const result = clothingAdvice({
    current: {temperature_2m:30, apparent_temperature:31, weather_code:0, is_day:1, shortwave_radiation:700},
    dogName: "小狗"
  });
  assert.match(result.title, /别穿衣服/);
  assert.match(result.why, /补水/);
});
