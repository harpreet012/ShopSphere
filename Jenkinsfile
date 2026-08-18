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

        // Prevent a stuck stage from running forever
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        COMPOSE_PROJECT_NAME = 'shopsphere-ci'
        DOCKER_BUILDKIT = '1'
        NPM_CONFIG_AUDIT = 'false'
        NPM_CONFIG_FUND = 'false'
        NPM_CONFIG_PREFER_OFFLINE = 'true'
        
        // ===== NPM NETWORK TIMEOUT CONFIGURATION =====
        // Prevents npm from silently waiting indefinitely on network requests
        NPM_CONFIG_FETCH_RETRIES = '2'
        NPM_CONFIG_FETCH_RETRY_MINTIMEOUT = '5000'
        NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT = '15000'
        NPM_CONFIG_FETCH_TIMEOUT = '60000'
        // =============================================
    }

    stages {

        stage('Clean Workspace') {
            steps {
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
                        echo ========== BACKEND DEPENDENCY INSTALLATION ==========
                        echo [%date% %time%] Starting npm ci with diagnostic flags...
                        npm ci --no-audit --no-fund --prefer-offline --ignore-scripts --loglevel=verbose
                        echo [%date% %time%] Backend dependencies installed successfully
                        echo ======================================================
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
                    bat 'npm test -- --ci --forceExit'
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
                        echo ========== FRONTEND DEPENDENCY INSTALLATION ==========
                        echo [%date% %time%] Starting npm ci with diagnostic flags...
                        npm ci --no-audit --no-fund --prefer-offline --ignore-scripts --loglevel=verbose
                        echo [%date% %time%] Frontend dependencies installed successfully
                        echo ======================================================
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
                    bat 'npm run build'
                }
            }
        }

        stage('Docker - Compose Validation') {
            steps {
                bat 'docker compose config'
            }
        }

        stage('Docker - Build Images') {
            options {
                timeout(time: 10, unit: 'MINUTES')
            }

            steps {
                bat 'docker compose build --pull'
            }
        }

        stage('Docker - Image Verification') {
            steps {
                bat 'docker image inspect shopsphere-backend:latest'
                bat 'docker image inspect shopsphere-frontend:latest'
            }
        }
    }

    post {

        success {
            echo '''
==================================================
ShopSphere CI PIPELINE SUCCESS
==================================================
Checkout       : PASS
Environment    : PASS
Backend Tests  : PASS
Frontend Build : PASS
Docker Config  : PASS
Docker Build   : PASS
Image Verify   : PASS
==================================================
'''
        }

        failure {
            echo '''
==================================================
ShopSphere CI PIPELINE FAILED
==================================================
Check the failed stage in Console Output.
Look for verbose npm logs above timeout message.
==================================================
'''
        }

        always {
            echo "Jenkins build finished: #${BUILD_NUMBER}"
        }
    }
}