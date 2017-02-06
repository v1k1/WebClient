angular.module('proton.sidebar')
    .directive('navigationItem', ($rootScope, $state, $stateParams, sidebarModel, dedentTpl, eventManager) => {

        const CLASS_ACTIVE = 'active';
        const CLASS_SPIN = 'spinMe';
        const STATES = sidebarModel.getStateConfig();

        const template = (key, { label, icon = '' }) => {
            const iconClassName = `sidebarApp-icon navigationItem-icon fa ${icon}`.trim();
            return dedentTpl(`<a href="#" title="${label}" data-state="${key}" class="navigationItem-item">
                <i class="${iconClassName}"></i>
                <span class="navigationItem-title">${label}</span>
                <em class="navigationItem-counter"></em>
                <button class="fa fa-repeat pull-right refresh navigationItem-btn-refresh"></button>
            </a>`);
        };

        const setSpinner = ($spin, lastTimeoutId) => {
            $spin.classList.add(CLASS_SPIN);
            clearTimeout(lastTimeoutId);
            return setTimeout(() => {

                /**
                 * Send request to get the last event, empty the cache
                 * for the current mailbox and then refresh the content
                 * automatically
                 */
                eventManager.call()
                    .then(() => $spin.classList.remove(CLASS_SPIN))
                    .catch((error) => {
                        console.error(error);
                        $spin.classList.remove(CLASS_SPIN);
                    });
            }, 500);
        };

        return {
            replace: true,
            template: '<li class="navigationItem-container"></li>',
            link(scope, el, { key }) {
                let id;
                const config = STATES[key];
                const unsubscribe = [];
                const render = () => (el[0].innerHTML = template(key, config));
                const updateCounter = () => {
                    const $counter = el[0].querySelector('.navigationItem-counter');
                    $counter.textContent = sidebarModel.unread(key);
                };

                // Check if we open the current state, mark it as active
                $state.includes(config.state) && el[0].classList.add(CLASS_ACTIVE);
                render();
                updateCounter();


                // Update the counter when we load then
                unsubscribe.push($rootScope.$on('app.cacheCounters', (e, { type }) => {
                    (type === 'load') && updateCounter();
                }));

                // Update the counter when we update it (too many updates if we update them via app.cacheCounters)
                unsubscribe.push($rootScope.$on('refreshElements', updateCounter));

                // Check the current state to set the current one as active
                unsubscribe.push($rootScope.$on('$stateChangeSuccess', () => {
                    if ($state.includes(config.state)) {
                        return el[0].classList.add(CLASS_ACTIVE);
                    }

                    el[0].classList.remove(CLASS_ACTIVE);
                }));

                const onClick = () => {
                    const sameRoute = $state.$current.name === config.state && !$stateParams.filter;
                    const firstPage = ~~$stateParams.page === 1 || angular.isUndefined($stateParams.page);

                    if (sameRoute && firstPage) {
                        // Hide sidebar for mobile
                        $rootScope.$emit('sidebarMobileToggle', false);
                        return (id = setSpinner(el[0].querySelector('.refresh'), id));
                    }

                    $state.go(config.state, { pages: null, filter: null, sort: null });
                };

                el.on('click', onClick);

                scope.$on('$destroy', () => {
                    el.off('click', onClick);
                    unsubscribe.forEach((cb) => cb());
                    unsubscribe.length = 0;
                });
            }
        };
    });