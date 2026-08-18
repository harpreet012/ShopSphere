pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()

        buildDiscarder(
            logRotator(
                numToKeepStr: '10',
                artifactNumToKeepStr: '10'
            )
        )

        // Prevent the entire pipeline from running forever
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        COMPOSE_PROJECT_NAME = 'shopsphere-ci'
        DOCKER_BUILDKIT = '1'

        // NPM reliability
        NPM_CONFIG_AUDIT = 'false'
        NPM_CONFIG_FUND = 'false'
        NPM_CONFIG_PREFER_OFFLINE = 'true'

        // Prevent npm from waiting indefinitely on network requests
        NPM_CONFIG_FETCH_RETRIES = '2'
        NPM_CONFIG_FETCH_RETRY_MINTIMEOUT = '5000'
        NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT = '15000'
        NPM_CONFIG_FETCH_TIMEOUT = '60000'
    }

    stages {

        stage('Clean Workspace') {
            steps {
                echo 'Cleaning Jenkins workspace...'
                deleteDir()
            }
        }

        stage('Checkout') {
            steps {
                echo 'Checking out ShopSphere source code...'

                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/harpreet012/ShopSphere.git'
                    ]]
                ])

                bat 'git rev-parse --short HEAD'
            }
        }

        stage('Environment Check') {
            steps {
                echo 'Checking Jenkins build environment...'

                bat 'java --version'
                bat 'git --version'
                bat 'node --version'
                bat 'npm --version'
                bat 'npm config get registry'
                bat 'docker --version'
                bat 'docker compose version'
            }
        }

        stage('Backend - Install Dependencies') {
            options {
                timeout(time: 5, unit: 'MINUTES')
            }

            steps {
                dir('server') {
                    bat '''
                        echo ==================================================
                        echo BACKEND DEPENDENCY INSTALLATION
                        echo ==================================================
                        echo [%date% %time%] Starting npm ci...

                        npm ci --no-audit --no-fund --prefer-offline --ignore-scripts --loglevel=verbose

                        echo [%date% %time%] Backend dependencies installed successfully
                        echo ==================================================
                    '''
                }
            }
        }

        stage('Backend - Tests') {
            options {
                timeout(time: 5, unit: 'MINUTES')
            }

            steps {
                dir('server') {
                    bat '''
                        echo ==================================================
                        echo BACKEND TESTS
                        echo ==================================================

                        npm test -- --ci --forceExit

                        echo ==================================================
                        echo BACKEND TESTS COMPLETED
                        echo ==================================================
                    '''
                }
            }
        }

        stage('Frontend - Install Dependencies') {
            options {
                timeout(time: 5, unit: 'MINUTES')
            }

            steps {
                dir('client') {
                    bat '''
                        echo ==================================================
                        echo FRONTEND DEPENDENCY INSTALLATION
                        echo ==================================================
                        echo [%date% %time%] Starting npm ci...

                        npm ci --no-audit --no-fund --prefer-offline --ignore-scripts --loglevel=verbose

                        echo [%date% %time%] Frontend dependencies installed successfully
                        echo ==================================================
                    '''
                }
            }
        }

        stage('Frontend - Production Build') {
            options {
                timeout(time: 5, unit: 'MINUTES')
            }

            steps {
                dir('client') {
                    bat '''
                        echo ==================================================
                        echo FRONTEND PRODUCTION BUILD
                        echo ==================================================

                        npm run build

                        echo ==================================================
                        echo FRONTEND BUILD COMPLETED
                        echo ==================================================
                    '''
                }
            }
        }

        stage('Prepare CI Environment') {
            steps {
                bat '''
                    echo ==================================================
                    echo PREPARING CI ENVIRONMENT
                    echo ==================================================

                    if not exist server\\.env (
                        echo server\\.env not found.
                        echo Creating temporary CI environment from server\\.env.example...
                        copy /Y server\\.env.example server\\.env
                    ) else (
                        echo server\\.env already exists.
                    )

                    echo CI environment prepared successfully.
                    echo ==================================================
                '''
            }
        }

        stage('Docker - Compose Validation') {
            steps {
                bat '''
                    echo ==================================================
                    echo DOCKER COMPOSE VALIDATION
                    echo ==================================================

                    docker compose config

                    echo ==================================================
                    echo DOCKER COMPOSE CONFIG VALID
                    echo ==================================================
                '''
            }
        }

        stage('Docker - Build Images') {
            options {
                timeout(time: 10, unit: 'MINUTES')
            }

            steps {
                bat '''
                    echo ==================================================
                    echo DOCKER IMAGE BUILD
                    echo ==================================================

                    docker compose build --pull

                    echo ==================================================
                    echo DOCKER IMAGE BUILD COMPLETED
                    echo ==================================================
                '''
            }
        }

        stage('Docker - Image Verification') {
            steps {
                bat '''
                    echo ==================================================
                    echo DOCKER IMAGE VERIFICATION
                    echo ==================================================

                    docker image inspect shopsphere-backend:latest
                    docker image inspect shopsphere-frontend:latest

                    echo Docker images verified successfully.
                    echo ==================================================
                '''
            }
        }
    }

    post {

        success {
            echo '''
==========================================================
             SHOPSPHERE CI PIPELINE SUCCESS
==========================================================

Checkout                    : PASS
Environment Check           : PASS
Backend Dependencies        : PASS
Backend Tests               : PASS
Frontend Dependencies       : PASS
Frontend Production Build   : PASS
CI Environment Preparation  : PASS
Docker Compose Validation   : PASS
Docker Image Build          : PASS
Docker Image Verification   : PASS

==========================================================
                 BUILD COMPLETED SUCCESSFULLY
==========================================================
'''
        }

        failure {
            echo '''
==========================================================
             SHOPSPHERE CI PIPELINE FAILED
==========================================================

Check the failed stage in Console Output.

==========================================================
'''
        }

        aborted {
            echo '''
==========================================================
             SHOPSPHERE CI PIPELINE ABORTED
==========================================================

The pipeline was stopped manually or reached a timeout.

==========================================================
'''
        }

        always {
            echo "Jenkins build finished: #${BUILD_NUMBER}"
        }
    }
}