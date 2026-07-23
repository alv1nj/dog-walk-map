(function(root, factory){
  const api = factory();
  if(typeof module === "object" && module.exports) module.exports = api;
  else root.LGBWeatherAdvice = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  "use strict";

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const num = (v, fallback=0) =>
    v === null || v === undefined || v === "" ? fallback :
    (Number.isFinite(+v) ? +v : fallback);

  // 把天气模型的气温/体感，与狗狗实际散步会遇到的日照、风口和潮湿分开处理。
  // 这不是另一份“气温”，而是用于穿衣建议的环境舒适度。
  function outdoorComfort(c={}){
    const air = num(c.temperature_2m);
    const apparent = num(c.apparent_temperature, air);
    const code = num(c.weather_code, 99);
    const isDay = num(c.is_day) === 1;
    const rain = num(c.precipitation);
    const radiation = num(c.shortwave_radiation);
    const cloud = num(c.cloud_cover, code <= 1 ? 10 : 70);
    const sunny = isDay && code <= 1 && cloud <= 45 && rain <= 0.05;

    // 阳光落在毛发上会让散步环境明显暖于阴处；阴天只保留很小的日照修正。
    const solarBonus = sunny
      ? clamp((radiation - 80) / 90, 0, 4)
      : (isDay && code <= 2 ? clamp((radiation - 150) / 180, 0, 1.5) : 0);
    const wetPenalty = rain > 0.1 ? 1.5 : 0;
    const value = air * 0.7 + apparent * 0.3 + solarBonus - wetPenalty;

    return {
      value: Math.round(value * 10) / 10,
      air, apparent, sunny,
      solarBonus: Math.round(solarBonus * 10) / 10,
      radiation, cloud
    };
  }

  function profileSensitivity(p){
    if(!p) return 0;
    const score =
      ({small:1.5, medium:0, large:-0.5}[p.size] ?? 0) +
      ({short:2, long:0, double:-2.5}[p.coat] ?? 0) +
      ({puppy:1, adult:0, senior:1.5}[p.age] ?? 0);
    return clamp(score, -3, 4);
  }

  function clothingAdvice({current={}, rainy=false, profile=null, dogName="狗狗"}={}){
    const env = outdoorComfort(current);
    const feel = env.value;
    const sensitivity = profileSensitivity(profile);
    const wind = num(current.wind_speed_10m);
    const gust = num(current.wind_gusts_10m);
    const breezy = wind >= 18 || gust >= 40;
    const veryWindy = wind >= 28 || gust >= 55;
    const sensitive = sensitivity >= 2;
    let dog = "🐶", title = "", why = "";

    if(feel >= 27 || env.air >= 29){
      dog = "🥵";
      title = `太热啦，${dogName}别穿衣服！`;
      why = "选阴凉路线、随时补水，并先用手背测试路面温度。";
    }else if(feel >= 16){
      dog = "🐕";
      title = `${dogName}不用穿衣服，轻装出发！`;
      why = "当前环境舒适，正常散步即可。";
    }else if(feel >= 12){
      dog = env.sunny ? "☀️" : "🐕";
      title = sensitive
        ? `${env.sunny ? "大晴天，" : ""}${dogName}不用穿厚棉衣`
        : `${dogName}不用穿衣服，轻装出发！`;
      why = sensitive
        ? "怕冷的小狗可带一件薄背心备用，先观察状态，不需要按严寒天气处理。"
        : "体感温和，正常活动会继续产热。";
    }else if(feel >= 8){
      dog = sensitive ? "👕" : "🐕";
      title = sensitive ? `给${dogName}穿件薄衣服` : `${dogName}薄衣可选，不必穿厚`;
      why = sensitive
        ? "小型、短毛、幼犬或老年犬更容易觉得凉，一件薄层就够了。"
        : "稍微有点凉，活动量正常的狗狗通常不需要厚衣。";
    }else if(feel >= 4){
      dog = "🧥";
      title = sensitive ? `建议给${dogName}穿保暖外套` : `给${dogName}穿件薄保暖衣`;
      why = "天气偏冷，衣服保持干燥，并留意发抖、夹尾或不愿继续走。";
    }else{
      dog = "🧣";
      title = `给${dogName}穿厚保暖衣`;
      why = feel <= 0 || env.apparent <= -3
        ? "接近或低于冰点，缩短散步时间；出现发抖、抬脚或动作迟缓就立即回家。"
        : "天气很冷，选择较短路线，并持续观察狗狗是否不舒服。";
    }

    if(rainy){
      dog = "☔";
      title = `建议给${dogName}穿轻便雨衣`;
      why = feel < 8
        ? "雨衣里面加一层薄保暖衣，重点是保持毛发干燥，回家及时擦干。"
        : "重点是防水和回家擦干，不必因为下雨就穿很厚。";
    }else if(env.sunny && env.solarBonus >= 2){
      why += ` 晴晒让散步环境比阴处暖约 ${Math.round(env.solarBonus)}°。`;
    }

    if(!rainy && breezy){
      why += veryWindy
        ? " 持续风或阵风较强，优先走有遮挡的路线。"
        : " 空旷风口会更凉，尽量走背风路线。";
    }
    if(profile && sensitivity !== 0) why += `（已按${dogName}的小档案调整）`;

    return {dog, title, why, comfort:env, sensitivity};
  }

  return {outdoorComfort, profileSensitivity, clothingAdvice};
});
