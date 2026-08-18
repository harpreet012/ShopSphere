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
    }

    environment {
        COMPOSE_PROJECT_NAME = 'shopsphere-ci'
        DOCKER_BUILDKIT = '1'
    }

    stages {

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
                bat 'docker --version'
                bat 'docker compose version'
            }
        }

        stage('Backend - Install Dependencies') {
            steps {
                dir('server') {
                    bat 'npm ci'
                }
            }
        }

        stage('Backend - Tests') {
            steps {
                dir('server') {
                    bat 'npm test -- --ci'
                }
            }
        }

        stage('Frontend - Install Dependencies') {
            steps {
                dir('client') {
                    bat 'npm ci'
                }
            }
        }

        stage('Frontend - Production Build') {
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
==================================================
'''
        }

        always {
            echo "Jenkins build finished: #${BUILD_NUMBER}"
        }
    }
}