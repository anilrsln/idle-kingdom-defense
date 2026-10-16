/**
 * ObjectPool — generic nesne havuzu.
 *
 * Amaç: sık yaratılıp yok edilen nesneleri (Enemy, Projectile) yeniden kullanmak;
 * her dalgada yüzlerce `new` + `destroy` yerine GC baskısını düşürmek.
 *
 * Sözleşme: havuzlanan sınıf iki metot sağlamalı:
 *   - reset(...args): bir havuz nesnesini yeniden kullanıma hazırlar (constructor
 *     ile aynı argümanları alır). TÜM instance state'ini sıfırlamalı ve uyuyan
 *     sprite'ı yeniden uyandırmalı. Yeni yaratılan nesnelerde de çağrılır.
 *   - sleep(): nesneyi havuza dönerken pasifleştirir (sprite gizle/pasif yap).
 *
 * Nesneler `destroy()` edilmez; release ile havuza döner. Gerçek yıkım yalnızca
 * sahne kapanınca (drain) gerekir.
 */
export default class ObjectPool {
  /**
   * @param {Function} factory - (pool, ...args) => yeni instance; genelde (p,...a)=>new Klass(...a)
   * @param {number} initialSize - önceden doldurulacak nesne sayısı (opsiyonel)
   */
  constructor(factory, initialSize = 0) {
    this._factory = factory;
    this._free = [];
    this._activeCount = 0;
    this._created = 0;
    for (let i = 0; i < initialSize; i++) {
      const obj = this._factory(this);
      obj.sleep?.();
      this._free.push(obj);
      this._created++;
    }
  }

  /** Havuzdan bir nesne al; argümanlar reset()'e geçer. */
  acquire(...args) {
    let obj = this._free.pop();
    if (obj) {
      obj.reset(...args);
    } else {
      obj = this._factory(this, ...args);
      this._created++;
      // factory new Klass(...args) döndürür; reset mantığı constructor'da
      // zaten çalıştıysa tekrar çağırmaya gerek yok. Ama tutarlılık için
      // sınıf, constructor içinde reset(...args) çağırarak tek yol kullanır.
    }
    this._activeCount++;
    return obj;
  }

  /** Nesneyi havuza geri ver; sleep() ile pasifleştirilir. */
  release(obj) {
    if (!obj) return;
    obj.sleep?.();
    this._free.push(obj);
    this._activeCount = Math.max(0, this._activeCount - 1);
  }

  /** Sahne kapanışı: tüm boştaki nesneleri gerçekten yok et. */
  drain() {
    this._free.forEach((o) => o.hardDestroy?.());
    this._free.length = 0;
    this._activeCount = 0;
  }

  /** Teşhis: {free, active, created} */
  stats() {
    return { free: this._free.length, active: this._activeCount, created: this._created };
  }
}
