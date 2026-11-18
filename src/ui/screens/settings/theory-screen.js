(function registerTheoryScreen(root) {
  const ui = root.NutriMealUI || {};

  ui.renderTheoryScreen = function renderTheoryScreen({
    weeklyReferenceRows = '',
    rdaMarkup = ''
  } = {}) {
    return `<div class="theory-page-toolbar"><button class="btn-quiet" id="settings-theory-back">← Настройки</button><span class="theory-document-label">СПРАВОЧНИК ПРИЛОЖЕНИЯ</span></div>
  <section class="theory-document-intro"><div class="theory-document-eyebrow">ДОКУМЕНТАЦИЯ</div><h2>Теория</h2><p>Здесь описаны методы расчёта и справочные принципы, которые используются в Планировании. Планирование показывает персональные результаты; этот раздел объясняет, откуда они берутся.</p></section>
  <div class="theory-document-layout">
   <nav class="theory-toc" aria-label="Содержание теории">
    <strong>Содержание</strong>
    <a href="#theory-energy">1. Расход энергии</a>
    <a href="#theory-adjustment">2. Корректировка калорий</a>
    <a href="#theory-macros">3. Расчёт КБЖУ</a>
    <a href="#theory-nutrients">4. Витамины и минералы</a>
    <a href="#theory-completeness">5. Полнота питания</a>
    <a href="#theory-variety">6. Разнообразие питания</a>
   </nav>
   <div class="theory-document-content">
    <article class="theory-chapter" id="theory-energy">
     <div class="theory-chapter-number">01 · ЭНЕРГЕТИЧЕСКИЙ ОБМЕН</div>
     <h3>Как рассчитывается расход энергии</h3>
     <p>Расчёт состоит из двух этапов: сначала оценивается базовый обмен веществ (BMR), затем учитывается повседневная активность для получения общего суточного расхода энергии (TDEE).</p>
     <h4>Базовый обмен веществ — BMR</h4>
     <p>BMR — оценка энергии, которую организм расходует в состоянии покоя для поддержания основных функций. В приложении используется формула Mifflin–St Jeor.</p>
     <div class="theory-formula-list">
      <div class="theory-formula"><span>Мужчины</span><strong>BMR = 10 × вес + 6,25 × рост − 5 × возраст + 5</strong></div>
      <div class="theory-formula"><span>Женщины</span><strong>BMR = 10 × вес + 6,25 × рост − 5 × возраст − 161</strong></div>
     </div>
     <p class="theory-definition"><strong>Переменные:</strong> вес указывается в килограммах, рост — в сантиметрах, возраст — в полных годах. Результат выражается в килокалориях в сутки.</p>
     <h4>Общий суточный расход — TDEE</h4>
     <p>TDEE оценивает общий расход энергии с учётом привычной активности.</p>
     <div class="theory-formula theory-formula-single"><span>Формула</span><strong>TDEE = BMR × коэффициент активности</strong></div>
     <table class="data-table theory-table"><thead><tr><th>Уровень активности</th><th>Коэффициент</th></tr></thead><tbody><tr><td>Минимальная</td><td>1,20</td></tr><tr><td>Низкая</td><td>1,375</td></tr><tr><td>Умеренная</td><td>1,55</td></tr><tr><td>Высокая</td><td>1,725</td></tr><tr><td>Очень высокая</td><td>1,90</td></tr></tbody></table>
     <div class="theory-note"><strong>Как учитываются тренировки</strong><p>Коэффициент активности должен отражать обычный образ жизни в целом, включая регулярные тренировки. Поэтому отдельные калории каждой тренировки повторно к TDEE не прибавляются — это помогло бы избежать двойного учёта.</p></div>
     <p class="theory-caveat">Это расчётная оценка, а не прямое измерение обмена веществ. Реальные потребности могут отличаться; оценку уточняют по динамике веса и самочувствию.</p>
    </article>
    <article class="theory-chapter" id="theory-adjustment">
     <div class="theory-chapter-number">02 · ЦЕЛЕВАЯ ЭНЕРГИЯ</div>
     <h3>Принцип корректировки калорий</h3>
     <p>Целевое потребление рассчитывается относительно TDEE. Выбранная цель определяет, будет ли план совпадать с расходом, создавать дефицит или профицит энергии.</p>
     <div class="theory-adjustment-grid">
      <div class="theory-adjustment-item"><strong>Поддержание веса</strong><p>Целевое потребление примерно соответствует TDEE.</p></div>
      <div class="theory-adjustment-item"><strong>Снижение веса</strong><p>Целевое потребление ниже TDEE: создаётся дефицит энергии.</p></div>
      <div class="theory-adjustment-item"><strong>Набор веса</strong><p>Целевое потребление выше TDEE: создаётся профицит энергии.</p></div>
     </div>
     <h4>Стартовые значения приложения</h4>
     <p>В текущей настройке для снижения веса используется стартовая корректировка −400 ккал в сутки, для набора — +300 ккал в сутки. Для поддержания корректировка равна нулю.</p>
     <div class="theory-note"><strong>Распределение макронутриентов</strong><p>После определения целевой калорийности приложение рассчитывает белки и жиры по выбранным настройкам. Углеводы получают оставшуюся энергетическую долю.</p></div>
    </article>
    <article class="theory-chapter" id="theory-macros">
     <div class="theory-chapter-number">03 · МАКРОНУТРИЕНТЫ</div>
     <h3>Как рассчитываются белки, жиры и углеводы</h3>
     <p>После определения целевой калорийности дневной план распределяет энергию между макронутриентами.</p>
     <h4>Белки</h4>
     <div class="theory-formula theory-formula-single"><span>Формула</span><strong>Белок, г/сутки = масса тела, кг × выбранная норма, г/кг</strong></div>
     <p>Для взрослых базовый ориентир составляет около 0,8 г/кг в сутки. Для тренирующихся людей часто приводится диапазон 1,4–2,0 г/кг в сутки.</p>
     <h4>Жиры</h4>
     <p>Допустимый диапазон распределения энергии составляет 20–35% суточной энергии. Стартовое значение прототипа — 30%.</p>
     <div class="theory-formula theory-formula-single"><span>Перевод доли энергии в граммы</span><strong>Жиры, г = целевые ккал × доля жиров ÷ 100 ÷ 9</strong></div>
     <h4>Углеводы</h4>
     <div class="theory-formula theory-formula-single"><span>Формула</span><strong>Углеводы, г = (целевые ккал − белки, г × 4 − жиры, г × 9) ÷ 4</strong></div>
    </article>
    <article class="theory-chapter" id="theory-nutrients">
     <div class="theory-chapter-number">04 · МИКРОНУТРИЕНТЫ</div>
     <h3>Рекомендуемые нормы витаминов и минералов</h3>
     <p>Таблица показывает суточное количество нутриентов для возрастной и половой группы, определённой по данным Профиля.</p>
     <ul class="theory-list"><li><strong>RDA</strong> — рекомендуемая суточная норма для почти всех здоровых людей соответствующей группы.</li><li><strong>AI</strong> — адекватное потребление при недостатке данных для RDA.</li></ul>
     <div class="theory-reference-table">${rdaMarkup}</div>
    </article>
    <article class="theory-chapter" id="theory-completeness">
     <div class="theory-chapter-number">05 · СТРУКТУРА РАЦИОНА</div>
     <h3>Полнота питания</h3>
     <p>Полнота означает, насколько регулярно в рацион включаются разные группы продуктов.</p>
     <table class="data-table theory-table"><thead><tr><th>Группа продуктов</th><th>Справочный ориентир</th></tr></thead><tbody>${weeklyReferenceRows}</tbody></table>
     <h4>Личные ориентиры</h4>
     <p>Пользователь может задать собственные ориентиры полноты и разнообразия по группам продуктов.</p>
    </article>
    <article class="theory-chapter" id="theory-variety">
     <div class="theory-chapter-number">06 · РАЗНООБРАЗИЕ</div>
     <h3>Разнообразие питания</h3>
     <p>Разнообразие означает, что внутри каждой группы используются разные продукты.</p>
     <p>В недельном блоке приложение считает уникальные продукты внутри каждой группы.</p>
    </article>
   </div>
  </div>`;
  };

  root.NutriMealUI = ui;
})(globalThis);
