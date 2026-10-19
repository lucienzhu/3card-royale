/* Share the shell without duplicating or replacing existing game controls. */
(()=>{'use strict';
 const menu=document.getElementById('settings-modal'),rules=document.getElementById('rule-page');
 if(!menu||!rules)return;
 for(const dialog of [menu,rules])dialog.classList.add('sz-drawer');
 rules.querySelector('.rg-head-actions').classList.add('drawer-head-actions');
 rules.querySelector('.rg-toolbar').classList.add('drawer-tabs');
 menu.querySelector('.qb-menu-tabs').classList.add('drawer-tabs');
 const actions=document.createElement('div');actions.className='drawer-head-actions';actions.dataset.noI18n='';
 const language=document.createElement('button');language.type='button';language.id='menu-language';
 const close=document.getElementById('close-settings');actions.append(language,close);menu.querySelector('.modal-head').append(actions);
 language.addEventListener('click',()=>GKLocale.setLanguage(GKLocale.language==='en'?'zh-CN':'en'));
 const shortcut=menu.querySelector('.menu-replay-shortcut');if(shortcut)menu.querySelector('#qb-menu-records').prepend(shortcut);
 let lastLanguage='';
 function labels(){const current=GKLocale.language;if(current===lastLanguage)return;lastLanguage=current;const en=current==='en';language.textContent=en?'中文':'EN';language.lang=en?'zh-CN':'en';language.setAttribute('aria-label',en?'将菜单切换为中文':'Switch menu to English');close.textContent=en?'Back to game':'回到牌桌';}
 new MutationObserver(labels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});labels();
})();
