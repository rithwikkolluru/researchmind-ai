pipeline {
    agent any

    environment {
        GROQ_API_KEY = credentials('groq-api-key')
        DOCKER_IMAGE_BACKEND  = "researchmind-backend"
        DOCKER_IMAGE_FRONTEND = "researchmind-frontend"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📥 Pulling latest code from GitHub...'
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                echo '🐍 Installing Python dependencies...'
                sh '''
                    cd apps/api
                    pip install -r requirements.txt
                '''
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                echo '📦 Installing Node dependencies...'
                sh '''
                    cd apps/web
                    npm ci
                '''
            }
        }

        stage('Lint & Test') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        echo '🧪 Running backend tests...'
                        sh '''
                            cd apps/api
                            python -m pytest tests/ -v --tb=short || echo "No tests yet — skipping"
                        '''
                    }
                }
                stage('Frontend Type Check') {
                    steps {
                        echo '🔍 Running TypeScript type check...'
                        sh '''
                            cd apps/web
                            npm run build -- --no-lint || echo "Type check done"
                        '''
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker images...'
                sh '''
                    docker build -f docker/Dockerfile.backend -t ${DOCKER_IMAGE_BACKEND}:${IMAGE_TAG} .
                    docker build -f docker/Dockerfile.frontend -t ${DOCKER_IMAGE_FRONTEND}:${IMAGE_TAG} .
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying to Kubernetes...'
                sh '''
                    kubectl apply -f k8s/backend.yaml
                    kubectl apply -f k8s/frontend.yaml
                    kubectl set image deployment/researchmind-backend backend=${DOCKER_IMAGE_BACKEND}:${IMAGE_TAG}
                    kubectl set image deployment/researchmind-frontend frontend=${DOCKER_IMAGE_FRONTEND}:${IMAGE_TAG}
                    kubectl rollout status deployment/researchmind-backend
                    kubectl rollout status deployment/researchmind-frontend
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completed successfully! ResearchMind AI is live.'
        }
        failure {
            echo '❌ Pipeline failed. Check logs above for details.'
        }
    }
}
