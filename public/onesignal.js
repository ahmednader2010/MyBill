/* MyBills OneSignal Web SDK wrapper.
 * Keeps all direct OneSignal SDK calls in one place.
 */
(function(){
  const VERIFICATION_KEY='mybills-onesignal-verification-shown-v1';
  let instance=null;
  let observer=null;
  let initialized=false;
  let initializationPromise=null;
  let verificationShown=false;

  function isRegistered(id){
    return typeof id==='string' && id.length>0 && !id.startsWith('local-');
  }

  function alreadyShown(){
    try{return localStorage.getItem(VERIFICATION_KEY)==='1'}catch{return false}
  }

  function markShown(){
    verificationShown=true;
    try{localStorage.setItem(VERIFICATION_KEY,'1')}catch{}
  }

  function evaluateSubscription(id,onRegistered){
    if(!isRegistered(id)||verificationShown||alreadyShown())return;
    markShown();
    onRegistered?.();
  }

  async function init({appId,externalId,onRegistered}){
    if(!appId)throw new Error('OneSignal App ID is not configured.');
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    await new Promise((resolve,reject)=>{
      window.OneSignalDeferred.push(async OneSignal=>{
        try{
          if(!initialized){
            if(!initializationPromise)initializationPromise=OneSignal.init({
              appId,
              serviceWorkerPath:'OneSignalSDKWorker.js',
              serviceWorkerParam:{scope:'/'},
              allowLocalhostAsSecureOrigin:false
            });
            await initializationPromise;
            initialized=true;
          }
          instance=OneSignal;

          observer=function(event){
            evaluateSubscription(event?.current?.id,onRegistered);
          };
          OneSignal.User.PushSubscription.addEventListener('change',observer);

          // The subscription ID can already exist before the observer is attached.
          evaluateSubscription(OneSignal.User.PushSubscription.id,onRegistered);

          if(externalId){
            try{await OneSignal.login(String(externalId))}catch(e){console.warn('OneSignal login failed',e)}
          }
          resolve(OneSignal);
        }catch(e){reject(e)}
      });
    });
    return instance;
  }

  async function requestPermission(){
    if(!instance)throw new Error('OneSignal is not initialized.');
    return instance.Notifications.requestPermission();
  }

  function getState(){
    if(!instance)return {ready:false,permission:false,subscriptionId:null,optedIn:false};
    return {
      ready:true,
      permission:!!instance.Notifications.permission,
      subscriptionId:instance.User.PushSubscription.id||null,
      optedIn:!!instance.User.PushSubscription.optedIn
    };
  }

  async function login(externalId){
    if(instance&&externalId)await instance.login(String(externalId));
  }

  async function optIn(){
    if(!instance)throw new Error('OneSignal is not initialized.');
    return instance.User.PushSubscription.optIn();
  }

  async function optOut(){
    if(!instance)throw new Error('OneSignal is not initialized.');
    return instance.User.PushSubscription.optOut();
  }

  window.myOneSignal={
    init,
    requestPermission,
    optIn,
    optOut,
    getState,
    login,
    isRegistered
  };
})();